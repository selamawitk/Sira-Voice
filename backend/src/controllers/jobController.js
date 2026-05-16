import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js'; // Added missing transaction ledger connection
import asyncHandler from '../utils/asyncHandler.js';
import { findMatchingWorkers } from '../services/jobMatcher.js';
import { analyzeJobForScam } from '../services/aiService.js';
import ScamAnalysis from '../models/ScamAnalysis.js';
import { createApplicationLogic } from './applicationController.js';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const normalizeLocationCoordinates = (location) => {
  if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    return location;
  }

  const [first, second] = location.coordinates;
  const looksLikeLatLng =
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    Math.abs(first) <= 90 &&
    Math.abs(second) <= 90 &&
    Math.abs(first) < Math.abs(second);

  if (looksLikeLatLng) {
    return {
      ...location,
      coordinates: [second, first]
    };
  }

  return location;
};

export const processNewJobMatches = async (job, io) => {
  const matches = await findMatchingWorkers(job);
  const nonAutoMatches = [];

  for (const match of matches) {
    const worker = match.worker;
    const canAutoApply = worker?.workerProfile?.agentPreferences?.autoApply;

    if (canAutoApply) {
      try {
        await createApplicationLogic(job._id, worker._id, io, true);
      } catch (err) {
        if (err.statusCode !== 400) {
          console.error(`Auto-Apply failed for worker ${worker._id}:`, err.message);
        }
      }
    } else {
      nonAutoMatches.push(match);
    }
  }

  if (io) {
    nonAutoMatches.forEach((match) => {
      if (match.worker?._id) {
        const userId = match.worker._id.toString();
        const payload = {
          title: 'Sira Agent: Match Found! 📍',
          message: `A new ${job.category || 'matching'} job matches your profile. Check it out!`,
          jobId: job._id,
          score: match.score
        };
        io.to(userId).emit('new_job_match', payload);
        io.to(userId).emit('new_match', payload);
      }
    });
  }

  return matches;
};

export const createJob = asyncHandler(async (req, res) => {
  const { title, description, category, salary, location } = req.body;
  
  const scamAnalysis = await analyzeJobForScam(description, salary);
  if (!scamAnalysis.isSafe) {
    res.status(400);
    throw new Error(`Job posting flagged as potentially unsafe: ${scamAnalysis.reason}`);
  }
  
  const normalizedLocation = normalizeLocationCoordinates(location);

  const job = await Job.create({
    employer: req.user._id,
    title,
    description,
    category,
    salary,
    location: normalizedLocation
  });

  const matches = await processNewJobMatches(job, req.io);
  const matchCount = matches.length;

  try {
    await ScamAnalysis.create({
      jobId: job._id,
      isSafe: scamAnalysis.isSafe,
      score: scamAnalysis.score,
      reason: scamAnalysis.reason,
      analyzedAt: new Date()
    });
  } catch (err) {
    console.error('Failed to persist scam analysis:', err?.message || err);
  }

  res.status(201).json({
    success: true,
    data: job,
    matchCount,
    topMatches: matches.slice(0, 3)
  });
});

export const getJobs = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 5, category } = req.query;
  let query = {};

  if (lat && lng) {
    query.location = {
      $near: {
        $geometry: { 
          type: "Point", 
          coordinates: [parseFloat(lng), parseFloat(lat)] 
        },
        $maxDistance: parseFloat(distance) * 1000 
      }
    };
  }

  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }

  const jobs = await Job.find(query)
    .populate('employer', 'fullName employerProfile.employerRating')
    .limit(20);

  res.json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('employer', 'fullName employerProfile.employerRating')
    .populate('worker', 'fullName phone workerProfile');

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  res.json({
    success: true,
    data: job
  });
});

export const getJobMatches = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const rankedWorkers = await findMatchingWorkers(job);
  
  res.json({
    success: true,
    jobTitle: job.title,
    matches: rankedWorkers
  });
});

export const startJob = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body; 
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.worker?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not assigned to this job');
  }

  const [jobLng, jobLat] = job.location.coordinates;
  const distance = getDistance(lat, lng, jobLat, jobLng);

  if (distance > 200) {
    res.status(403);
    throw new Error(`Verification failed: You are ${Math.round(distance)}m away. Move closer to the site.`);
  }

  job.status = 'in-progress';
  job.startedAt = Date.now();
  await job.save();

  res.json({
    success: true,
    message: 'GPS Verified. Job is now in-progress.',
    job
  });
});

// ==========================================================
//  UPDATED FUNCTION: PROCESSES SAVING THROUGH TRANSACTION MODEL
// ==========================================================
export const completeJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Unauthorized: Only the employer can mark this job as completed');
  }

  if (job.status !== 'in-progress') {
    res.status(400);
    throw new Error(`Job cannot be completed because its current status is: ${job.status}`);
  }

  if (!job.worker) {
    res.status(400);
    throw new Error('This job cannot be completed because no worker was ever assigned');
  }

  // 1. Update Job Status Lifecycle
  job.status = 'completed';
  job.completedAt = Date.now();
  await job.save();

  const payoutAmount = Number(job.salary) || 0;
  const earningRef = `EARN-${job._id}-${Date.now()}`;

  // 2. Create entry inside your separate Transaction collection schema
  await Transaction.create({
    employer: job.employer,
    worker: job.worker,
    job: job._id,
    amount: payoutAmount,
    currency: 'ETB',
    tx_ref: earningRef,
    status: 'success', 
    purpose: `Job Execution Earning: ${job.title}`,
    paidAt: new Date()
  });

  // 3. Update active worker digital wallet balance safely
  const worker = await User.findById(job.worker);
  if (worker) {
    if (!worker.workerProfile) worker.workerProfile = {};
    if (worker.workerProfile.balance === undefined) {
      worker.workerProfile.balance = 0;
    }

    worker.workerProfile.balance += payoutAmount;
    await worker.save();

    // 4. Emit live update over WebSockets
    if (req.io) {
      req.io.to(worker._id.toString()).emit('payment_received', {
        title: 'Payment Verified! 💸',
        message: `You earned ${payoutAmount} ETB for completing "${job.title}".`,
        balance: worker.workerProfile.balance
      });
    }
  }

  res.json({
    success: true,
    message: 'Job successfully completed. Financial audit records updated.',
    job
  });
});