import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ScamAnalysis from '../models/ScamAnalysis.js';

import asyncHandler from '../utils/asyncHandler.js';

import { findMatchingWorkers } from '../services/jobMatcher.js';
import { analyzeJobForScam } from '../services/aiService.js';

import { createApplicationLogic } from './applicationController.js';

/* =========================
   📍 DISTANCE HELPER
========================= */
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

/* =========================
   📍 NORMALIZE LOCATION
========================= */
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

/* =========================
   🤖 AI MATCH PROCESSOR
========================= */
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
          true
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

  /* =========================
     📡 REALTIME NOTIFICATIONS
  ========================= */
  if (io) {
    for (const match of nonAutoMatches) {
      const userId = match.worker?._id?.toString();
      if (!userId) continue;

      const payload = {
        title: 'Sira Agent Match 📍',
        message: `New ${job.category || 'job'} matches your profile`,
        jobId: job._id,
        score: match.score,
      };

      io.to(userId).emit('new_job_match', payload);
      io.to(userId).emit('new_match', payload);
    }
  }

  return matches;
};

/* =========================
   🟢 CREATE JOB
========================= */
export const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    salary,
    location,
  } = req.body;

  /* AI scam check */
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

  /* save scam analysis log */
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

/* =========================
   🔍 GET JOBS (SEARCH + GEO)
========================= */
export const getJobs = asyncHandler(async (req, res) => {
  const {
    lat,
    lng,
    distance = 5,
    category,
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

  const jobs = await Job.find(query)
    .populate(
      'employer',
      'fullName employerProfile.employerRating'
    )
    .limit(20);

  res.json({
    success: true,
    count: jobs.length,
    data: jobs,
  });
});

/* =========================
   📄 GET JOB BY ID
========================= */
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

/* =========================
   🤝 GET MATCHES
========================= */
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

/* =========================
   🚀 START JOB (GPS VERIFY)
========================= */
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

    res.json({
      success: true,
      message: 'Job started',
      job,
    });
  }
);

/* =========================
   💰 COMPLETE JOB + PAYMENT
========================= */
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

    /* mark completed */
    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    const amount = Number(job.salary) || 0;

    const txRef = `EARN-${job._id}-${Date.now()}`;

    /* transaction record */
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

    /* update wallet */
    const worker = await User.findById(job.worker);

    if (worker) {
      worker.workerProfile =
        worker.workerProfile || {};

      worker.workerProfile.balance =
        worker.workerProfile.balance || 0;

      worker.workerProfile.balance += amount;

      await worker.save();

      /* notify worker */
      req.io?.to(worker._id.toString()).emit(
        'payment_received',
        {
          title: 'Payment Received 💸',
          message: `+${amount} ETB`,
          balance:
            worker.workerProfile.balance,
        }
      );
    }

    res.json({
      success: true,
      message: 'Job completed successfully',
      job,
    });
  }
);