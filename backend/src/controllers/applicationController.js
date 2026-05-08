import Application from '../models/Application.js';
import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendRealTimeNotification } from '../services/notificationService.js';

export const getMyApplicationHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const query =
    req.user.role === 'employer'
      ? { employer: userId }
      : req.user.role === 'worker'
        ? { worker: userId }
        : {};

  const applications = await Application.find(query)
    .populate('job')
    .populate('worker', 'fullName phone workerProfile.averageRating isVerified')
    .populate('employer', 'fullName phone employerProfile.employerRating isVerified')
    .sort({ updatedAt: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
});

export const getApplicationsForJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.employer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view applications for this job');
  }

  const applications = await Application.find({ job: jobId })
    .populate('worker', 'fullName phone workerProfile.averageRating isVerified')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
});

export const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const workerId = req.user._id;

  const application = await createApplicationLogic(jobId, workerId, req.io, false);

  res.status(201).json(application);
});

export const createApplicationLogic = async (jobId, workerId, io, isAutoApply = false) => {
  const alreadyApplied = await Application.findOne({ 
    job: jobId, 
    worker: workerId 
  });

  if (alreadyApplied) {
    const error = new Error('Already applied to this job');
    error.statusCode = 400;
    throw error;
  }

  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }

  const application = await Application.create({
    job: jobId,
    worker: workerId,
    employer: job.employer,
    status: 'pending',
    appliedByAI: isAutoApply,
    matchScore: isAutoApply ? 85 : 0 
  });

  const notificationData = {
    title: isAutoApply ? "Sira Agent: Auto-Match! 🤖" : "New Applicant! 👤",
    message: isAutoApply 
      ? `Our AI Agent automatically applied a top-tier match for your "${job.title}" post.`
      : `A worker has applied for your "${job.title}" post.`,
    jobId: job._id,
    type: 'match'
  };

  await sendRealTimeNotification(io, job.employer, notificationData);

  return application;
};

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const application = await Application.findById(id).populate('job worker');
  
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  if (application.employer.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this application');
  }

  application.status = status;
  await application.save();

  if (status === 'accepted') {
    await Job.findByIdAndUpdate(application.job._id, { 
      status: 'in-progress', 
      worker: application.worker._id 
    });
  }

  if (status === 'completed') {
    await Job.findByIdAndUpdate(application.job._id, {
      status: 'completed'
    });
  }

  const workerNotification = {
    title: status === 'accepted' ? "You're Hired! 🎉" : "Application Update",
    message: status === 'accepted' 
      ? `Pack your tools! Your application for "${application.job.title}" was accepted.`
      : `Status updated for "${application.job.title}": ${status}`,
    jobId: application.job._id,
    type: 'system'
  };

  if (req.io) {
    req.io.to(application.worker._id.toString()).emit('application_status', {
      title: workerNotification.title,
      message: workerNotification.message,
      jobId: application.job._id,
      status: application.status
    });
  }

  await sendRealTimeNotification(req.io, application.worker._id, workerNotification);

  res.json(application);
});