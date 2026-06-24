import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Payment from '../models/Payment.js';
import ScamAnalysis from '../models/ScamAnalysis.js';

import asyncHandler from '../utils/asyncHandler.js';

import { findMatchingWorkers } from '../services/jobMatcher.js';
import { analyzeJobForScam } from '../services/aiService.js';
import { sendPaymentNotification, sendContractNotification, sendAIAgentNotification, sendRealTimeNotification } from '../services/notificationService.js';

import { createApplicationLogic } from './applicationController.js';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;

  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const normalizeLocationCoordinates = (location) => {
  if (
    !location ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    return location;
  }

  const [a, b] = location.coordinates;

  const looksLikeLatLng =
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    Math.abs(a) <= 90 &&
    Math.abs(b) <= 90 &&
    Math.abs(a) < Math.abs(b);

  if (looksLikeLatLng) {
    return {
      ...location,
      coordinates: [b, a], // fix swap → [lng, lat]
    };
  }

  return location;
};

export const processNewJobMatches = async (job, io) => {
  const matches = await findMatchingWorkers(job, io);

  const nonAutoMatches = [];

  for (const match of matches) {
    const worker = match.worker;

    const autoApply =
      worker?.workerProfile?.agentPreferences?.autoApply;

    if (autoApply) {
      try {
        await createApplicationLogic(
          job._id,
          worker._id,
          io,
          true,
          0,
          false,
          null
        );
      } catch (err) {
        if (err.statusCode !== 400) {
          console.error(
            `Auto-apply failed for ${worker._id}:`,
            err.message
          );
        }
      }
    } else {
      nonAutoMatches.push(match);
    }
  }

  if (io) {
    for (const match of nonAutoMatches) {
      const userId = match.worker?._id?.toString();
      if (!userId) continue;

      const payload = {
        title: 'Sira Agent Match',
        message: `New ${job.category || 'job'} matches your profile`,
        jobId: job._id,
        score: match.score,
      };

      io.to(userId).emit('new_job_match', payload);
      io.to(userId).emit('new_match', payload);

      sendAIAgentNotification(io, userId, payload.title, payload.message, { jobId: job._id, score: match.score });
    }
  }

  return matches;
};

export const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    salary,
    location,
  } = req.body;

  const scamAnalysis = await analyzeJobForScam(description, salary);

  if (!scamAnalysis.isSafe) {
    return res.status(400).json({
      success: false,
      message: `Job flagged: ${scamAnalysis.reason}`,
      analysis: scamAnalysis,
    });
  }

  const normalizedLocation =
    normalizeLocationCoordinates(location);

  const job = await Job.create({
    employer: req.user._id,
    title,
    description,
    category,
    salary,
    location: normalizedLocation,
    isAiFlagged: !scamAnalysis.isSafe,
    aiRiskScore: scamAnalysis.score,
    aiAnalysis: scamAnalysis,
  });

  const matches = await processNewJobMatches(
    job,
    req.io
  );

  try {
    await ScamAnalysis.create({
      jobId: job._id,
      ...scamAnalysis,
      analyzedAt: new Date(),
    });
  } catch (err) {
    console.error(
      'Scam analysis save failed:',
      err.message
    );
  }

  res.status(201).json({
    success: true,
    data: job,
    matchCount: matches.length,
    topMatches: matches.slice(0, 3),
  });
});

export const getJobs = asyncHandler(async (req, res) => {
  const {
    lat,
    lng,
    distance = 5,
    category,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (lat && lng) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(lng),
            parseFloat(lat),
          ],
        },
        $maxDistance: parseFloat(distance) * 1000,
      },
    };
  }

  if (category) {
    query.category = {
      $regex: category,
      $options: 'i',
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Job.countDocuments(query);

  const jobs = await Job.find(query)
    .populate(
      'employer',
      'fullName employerProfile.employerRating'
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: jobs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: jobs,
  });
});

export const getJobById = asyncHandler(
  async (req, res) => {
    const job = await Job.findById(req.params.id)
      .populate(
        'employer',
        'fullName employerProfile.employerRating'
      )
      .populate(
        'worker',
        'fullName phone workerProfile'
      );

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: job });
  }
);

export const getJobMatches = asyncHandler(
  async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const matches = await findMatchingWorkers(
      job,
      req.io
    );

    res.json({
      success: true,
      jobTitle: job.title,
      matches,
    });
  }
);

export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  if (job.employer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this job' });
  }

  if (job.status !== 'open') {
    return res.status(400).json({ success: false, message: 'Can only edit open jobs' });
  }

  const fields = ['title', 'description', 'category', 'salary', 'location'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) job[f] = req.body[f];
  });

  await job.save();

  res.json({ success: true, data: job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  if (job.employer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this job' });
  }

  job.status = 'cancelled';
  await job.save();

  if (job.worker) {
    sendContractNotification(req.io, job.worker, 'Job Cancelled', `Job "${job.title}" has been cancelled.`, null);
  }

  res.json({ success: true, message: 'Job cancelled' });
});

export const startJob = asyncHandler(
  async (req, res) => {
    const { lat, lng } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (
      job.worker?.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not assigned worker',
      });
    }

    const [jobLng, jobLat] =
      job.location.coordinates;

    const distance = getDistance(
      lat,
      lng,
      jobLat,
      jobLng
    );

    if (distance > 200) {
      return res.status(403).json({
        success: false,
        message: `Too far: ${Math.round(
          distance
        )}m away`,
      });
    }

    job.status = 'in-progress';
    job.startedAt = Date.now();

    await job.save();

    sendContractNotification(req.io, job.employer, 'Work Started', `Worker has started "${job.title}".`, null);

    res.json({
      success: true,
      message: 'Job started',
      job,
    });
  }
);

export const workerMarkComplete = asyncHandler(
  async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.worker?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only assigned worker can mark complete' });
    }

    if (job.status !== 'in-progress') {
      return res.status(400).json({ message: `Invalid status: ${job.status}` });
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    await Application.findOneAndUpdate(
      { job: job._id, worker: job.worker },
      { status: 'completed' }
    );

    sendRealTimeNotification(req.io, job.employer.toString(), {
      title: 'Worker Marked Job Complete',
      message: `Worker has marked "${job.title}" as completed. Please review and close the job.`,
      type: 'SYSTEM',
      jobId: job._id,
      additionalData: { action: 'close_job' }
    });

    res.json({
      success: true,
      message: 'Job marked as complete. Employer will review and close.',
      job,
      redirectToRating: false,
    });
  }
);

export const employerCloseJob = asyncHandler(
  async (req, res) => {
    const job = await Job.findById(req.params.id).populate('worker', 'fullName paymentProfile');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ message: `Job must be completed first. Current: ${job.status}` });
    }

    const amount = Number(job.salary) || 0;

    await Payment.create({
      employerId: job.employer,
      workerId: job.worker._id,
      jobId: job._id,
      contractId: null,
      amount,
      currency: 'ETB',
      tx_ref: `PENDING-${job._id}-${Date.now()}`,
      status: 'pending',
      purpose: 'job_payment',
    });

    sendRealTimeNotification(req.io, job.worker._id.toString(), {
      title: 'Job Closed — Payment Pending',
      message: `"${job.title}" was closed by employer. Payment of ETB ${amount} is being processed.`,
      type: 'PAYMENT',
      jobId: job._id,
      additionalData: { action: 'view_job' }
    });

    res.json({
      success: true,
      message: 'Job closed. Process payment to release funds.',
      job,
      requiresPayment: true,
    });
  }
);

export const completeJob = asyncHandler(
  async (req, res) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res
        .status(404)
        .json({ message: 'Job not found' });
    }

    if (
      job.employer.toString() !==
      req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: 'Unauthorized' });
    }

    if (job.status !== 'in-progress') {
      return res.status(400).json({
        message: `Invalid status: ${job.status}`,
      });
    }

    if (!job.worker) {
      return res.status(400).json({
        message: 'No worker assigned',
      });
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    const amount = Number(job.salary) || 0;

    const txRef = `EARN-${job._id}-${Date.now()}`;

    await Transaction.create({
      employer: job.employer,
      worker: job.worker,
      job: job._id,
      amount,
      currency: 'ETB',
      tx_ref: txRef,
      status: 'success',
      purpose: `Job: ${job.title}`,
      paidAt: new Date(),
    });

    const worker = await User.findById(job.worker);

    if (worker) {
      worker.workerProfile =
        worker.workerProfile || {};

      worker.workerProfile.balance =
        worker.workerProfile.balance || 0;

      worker.workerProfile.balance += amount;

      await worker.save();

      sendPaymentNotification(req.io, worker._id.toString(), amount, job.title, null);
    }

    sendRealTimeNotification(req.io, job.worker.toString(), {
      title: 'Job Completed',
      message: `"${job.title}" was marked complete. Please rate your experience.`,
      type: 'SYSTEM',
      jobId: job._id,
      additionalData: { action: 'rate_job' }
    });

    res.json({
      success: true,
      message: 'Job completed successfully',
      job,
      redirectToRating: true,
    });
  }
);