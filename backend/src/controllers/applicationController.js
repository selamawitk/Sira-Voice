import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Contract from '../models/Contract.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  sendRealTimeNotification,
  sendHireNotification,
  sendJobMatchNotification
} from '../services/notificationService.js';

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
    .populate(
      'worker',
      `
        fullName
        email
        phone
        profileImage
        location
        skills
        languages
        bio
        experienceLevel
        availability
        completedJobs
        isVerified
        workerProfile.averageRating
        workerProfile.totalRatings
        workerProfile.portfolio
        workerProfile.resume
      `
    )
    .populate(
      'employer',
      `
        fullName
        email
        phone
        companyName
        profileImage
        location
        isVerified
        employerProfile.employerRating
      `
    )
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
    .populate(
      'worker',
      `
        fullName
        email
        phone
        profileImage
        location
        skills
        languages
        bio
        experienceLevel
        availability
        completedJobs
        isVerified
        workerProfile.averageRating
        workerProfile.totalRatings
        workerProfile.portfolio
        workerProfile.resume
      `
    )
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

  const application = await createApplicationLogic(
    jobId,
    workerId,
    req.io,
    false
  );

  res.status(201).json(application);
});

export const createApplicationLogic = async (
  jobId,
  workerId,
  io,
  isAutoApply = false,
  matchScore = 0
) => {
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

  const worker = await User.findById(workerId);

  const application = await Application.create({
    job: jobId,
    worker: workerId,
    employer: job.employer,
    status: 'pending',
    appliedByAI: isAutoApply,
    matchScore: matchScore || (isAutoApply ? 85 : 0),
    workerSnapshot: {
      fullName: worker?.fullName,
      profileImage: worker?.profileImage,
      skills: worker?.workerProfile?.skills,
      bio: worker?.workerProfile?.bio,
      experienceYears: worker?.workerProfile?.experienceYears,
      hourlyRate: worker?.workerProfile?.hourlyRate,
      location: worker?.location,
      averageRating: worker?.workerProfile?.averageRating,
      totalRatings: worker?.workerProfile?.totalRatings,
      completedJobs: worker?.workerProfile?.completedJobs,
      availability: worker?.workerProfile?.availability
    }
  });

  await sendRealTimeNotification(io, job.employer, {
    title: isAutoApply ? 'Sira AI Match 🤖' : 'New Applicant 👤',
    message: isAutoApply
      ? `AI matched a worker for "${job.title}"`
      : `New applicant for "${job.title}"`,
    jobId: job._id,
    type: isAutoApply ? 'JOB_MATCH' : 'SYSTEM'
  });

  if (isAutoApply) {
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

  const employer = await Job.findById(job._id).populate(
    'employer',
    'fullName'
  );

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
    title: status === 'accepted' ? "You're Hired 🎉" : 'Application Update',
    message:
      status === 'accepted'
        ? `Your application for "${job.title}" was accepted`
        : `Status updated: ${status}`,
    jobId: job._id,
    type: status === 'accepted' ? 'HIRE' : 'SYSTEM'
  };

  if (status !== 'accepted') {
    await sendRealTimeNotification(req.io, application.worker._id, workerNotification);
  }

  res.status(200).json({
    success: true,
    data: application
  });
});

export const workerMarkFinished = asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const contract = await Contract.findById(contractId).populate('jobId');

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.workerId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this contract');
  }

  contract.status = 'completed';
  await contract.save();

  await Job.findByIdAndUpdate(contract.jobId._id, {
    status: 'completed'
  });

  await Application.findOneAndUpdate(
    {
      job: contract.jobId._id,
      worker: contract.workerId
    },
    {
      status: 'completed'
    }
  );

  await sendRealTimeNotification(req.io, contract.employerId, {
    title: 'Work Finished 🛠️',
    message: `Worker marked service for "${contract.jobId.title}" as done. Please review and release payment.`,
    type: 'SYSTEM',
    contractId: contract._id,
    jobId: contract.jobId._id
  });

  res.status(200).json({
    success: true,
    message: 'Contract marked as finished successfully',
    data: contract
  });
});

export const hireWorker = asyncHandler(async (req, res) => {
  req.body.status = 'accepted';
  return updateApplicationStatus(req, res);
});