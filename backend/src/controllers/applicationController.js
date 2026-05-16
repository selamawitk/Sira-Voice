import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Contract from '../models/Contract.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendRealTimeNotification, sendHireNotification, sendJobMatchNotification } from '../services/notificationService.js';

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

export const createApplicationLogic = async (jobId, workerId, io, isAutoApply = false, matchScore = 0) => {
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
    matchScore: matchScore || (isAutoApply ? 85 : 0)
  });

  await sendRealTimeNotification(io, job.employer, {
    title: isAutoApply ? "Sira AI Match 🤖" : "New Applicant 👤",
    message: isAutoApply
      ? `AI matched a worker for "${job.title}"`
      : `New applicant for "${job.title}"`,
    jobId: job._id,
    type: isAutoApply ? 'JOB_MATCH' : 'SYSTEM'
  });

  if (isAutoApply) {
    // Also notify the worker that they've been matched
    await sendJobMatchNotification(io, workerId, job._id, job.title);
  }

  return application;
};

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const application = await Application.findById(id)
    .populate('job')
    .populate('worker');

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

  const job = application.job;
  const employer = await Job.findById(job._id).populate('employer', 'fullName');

  if (status === 'accepted') {
    await Job.findByIdAndUpdate(job._id, {
      status: 'in-progress',
      worker: application.worker._id
    });

    const contract = await Contract.create({
      employerId: job.employer,
      workerId: application.worker._id,
      jobId: job._id,
      agreedAmount: job.salary,
      paymentType: 'daily',
      status: 'active'
    });

    // Send enhanced HIRE notification
    await sendHireNotification(
      req.io,
      application.worker._id,
      employer.employer?.fullName || 'Employer',
      job.title,
      contract._id
    );
  }

  if (status === 'completed') {
    await Job.findByIdAndUpdate(job._id, {
      status: 'completed'
    });
  }

  const workerNotification = {
    title: status === 'accepted' ? "You're Hired 🎉" : "Application Update",
    message:
      status === 'accepted'
        ? `Your application for "${job.title}" was accepted`
        : `Status updated: ${status}`,
    jobId: job._id,
    type: status === 'accepted' ? 'HIRE' : 'SYSTEM'
  };

  if (req.io) {
    req.io.to(application.worker._id.toString()).emit('application_status', {
      title: workerNotification.title,
      message: workerNotification.message,
      jobId: job._id,
      status: application.status
    });
  }

  // Don't double-notify for 'accepted' status since we already sent HIRE notification
  if (status !== 'accepted') {
    await sendRealTimeNotification(req.io, application.worker._id, workerNotification);
  }

  res.json(application);
});

// 🆕 Added hireWorker function to fix the SyntaxError
export const hireWorker = asyncHandler(async (req, res) => {
  const { id } = req.params; // This is the application ID

  // We reuse the updateApplicationStatus logic for 'accepted'
  req.body.status = 'accepted';
  return updateApplicationStatus(req, res);
});