import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import asyncHandler from '../utils/asyncHandler.js';
import ScamAnalysis from '../models/ScamAnalysis.js';
import { sendSystemNotification } from '../services/notificationService.js';

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

export const getScamAnalysis = asyncHandler(async (req, res) => {
  const flaggedJobs = await Job.find({ isAiFlagged: true })
    .populate('employer', 'fullName email phone')
    .sort({ createdAt: -1 })
    .limit(100);

  const data = flaggedJobs.map(job => ({
    _id: job._id,
    title: job.title,
    description: job.description?.substring(0, 200),
    employer: job.employer,
    salary: job.salary,
    status: job.status,
    aiRiskScore: job.aiRiskScore || 0,
    aiReason: job.aiAnalysis?.reason || job.aiAnalysis?.isSafe === false ? 'Flagged by AI' : 'No reason',
    flaggedAt: job.createdAt,
  }));

  res.json({ success: true, count: data.length, data });
});

export const getScamHistory = asyncHandler(async (req, res) => {
  const history = await ScamAnalysis.find()
    .populate({ path: 'jobId', select: 'title location salary employer' })
    .sort({ analyzedAt: -1 })
    .limit(200);

  res.status(200).json({ success: true, data: history, count: history.length });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role && ['worker', 'employer', 'admin'].includes(role)) {
    query.role = role;
  }
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const users = await User.find(query)
    .select('-password -passkey')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: users,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
  });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.isActive = false;
  await user.save();

  sendSystemNotification(req.io, user._id, 'Account Suspended', 'Your account has been suspended by an administrator. Contact support for more information.');

  res.json({ success: true, message: 'User suspended', data: user });
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.isActive = true;
  await user.save();

  sendSystemNotification(req.io, user._id, 'Account Reactivated', 'Your account has been reactivated by an administrator.');

  res.json({ success: true, message: 'User activated', data: user });
});

export const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.role === 'worker') {
    user.workerProfile = user.workerProfile || {};
    user.workerProfile.verified = true;
  } else if (user.role === 'employer') {
    user.employerProfile = user.employerProfile || {};
    user.employerProfile.verified = true;
  }

  await user.save();

  sendSystemNotification(req.io, user._id, 'Account Verified', 'Your account has been verified by an administrator. You can now access all features.');

  res.json({ success: true, message: 'User verified', data: user });
});

export const unverifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.role === 'worker') {
    user.workerProfile = user.workerProfile || {};
    user.workerProfile.verified = false;
  } else if (user.role === 'employer') {
    user.employerProfile = user.employerProfile || {};
    user.employerProfile.verified = false;
  }

  await user.save();

  sendSystemNotification(req.io, user._id, 'Verification Revoked', 'Your account verification has been revoked by an administrator.');

  res.json({ success: true, message: 'User unverified', data: user });
});