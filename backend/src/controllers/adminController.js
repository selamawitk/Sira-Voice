import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import asyncHandler from '../utils/asyncHandler.js';
import ScamAnalysis from '../models/ScamAnalysis.js';

export const getPlatformStats = asyncHandler(async (req, res) => {
  const totalWorkers = await User.countDocuments({ role: 'worker' });
  const totalEmployers = await User.countDocuments({ role: 'employer' });
  const totalJobsPosted = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'open' });
  const completedJobs = await Job.countDocuments({ status: 'completed' });
  const totalMatches = await Application.countDocuments({ status: 'accepted' });
  const flaggedJobs = await Job.countDocuments({ isAiFlagged: true });

  const earningsData = await Job.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: "$salary" } } }
  ]);

  const totalEarnings = earningsData.length > 0 ? earningsData[0].total : 0;

  res.status(200).json({
    success: true,
    data: {
      users: { workers: totalWorkers, employers: totalEmployers },
      jobs: { total: totalJobsPosted, active: activeJobs, completed: completedJobs, flagged: flaggedJobs },
      matches: totalMatches,
      impact: { totalEarningsETB: totalEarnings, currency: "ETB" }
    }
  });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (job) {
    await job.deleteOne();
    res.json({ success: true, message: 'Job removed by admin' });
  } else {
    res.status(404);
    throw new Error('Job not found');
  }
});

export const getScamHistory = asyncHandler(async (req, res) => {
  const history = await ScamAnalysis.find()
    .populate({ path: 'jobId', select: 'title location salary employer' })
    .sort({ analyzedAt: -1 })
    .limit(200);

  res.status(200).json({ success: true, data: history, count: history.length });
});