import Job from '../models/Job.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { findMatchingWorkers } from '../services/jobMatcher.js';
import { analyzeJobForScam } from '../services/aiService.js';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
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

export const createJob = asyncHandler(async (req, res) => {
  const { title, description, category, salary, location } = req.body;
  
  // Scam detection
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

  const matches = await findMatchingWorkers(job) || [];
  const matchCount = matches.length;

  if (matchCount > 0) {
    matches.forEach(match => {
      if (req.io && match._id) {
        const userId = match._id.toString();
        const payload = {
          title: "Sira Agent: Match Found! 📍",
          message: `A new ${category} job matches your profile. Check it out!`,
          jobId: job._id
        };
        req.io.to(userId).emit('new_job_match', payload);
        req.io.to(userId).emit('new_match', payload);
      }
    });
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
    .populate('worker', 'fullName phone');

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