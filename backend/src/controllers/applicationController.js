import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Contract from '../models/Contract.js';
import User from '../models/User.js';
import Rating from '../models/Rating.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  sendRealTimeNotification,
  sendHireNotification,
  sendJobMatchNotification,
  sendJobCompleteNotification
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
  const { includeCv, cvData, source, message } = req.body;

  const application = await createApplicationLogic(
    jobId,
    workerId,
    req.io,
    false,
    0,
    includeCv,
    cvData,
    source || 'FORM',
    message || ''
  );

  res.status(201).json(application);
});

export const createApplicationLogic = async (
  jobId,
  workerId,
  io,
  isAutoApply = false,
  matchScore = 0,
  includeCv = false,
  cvData = null,
  source = 'FORM',
  message = ''
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

  const snapshot = {
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
    availability: worker?.workerProfile?.availability,
    ...(includeCv && cvData ? {
      cv: cvData.cv || '',
      cvSkills: cvData.skills || worker?.workerProfile?.skills,
      cvExperience: cvData.experienceYears || worker?.workerProfile?.experienceYears,
      cvLocation: cvData.location || '',
      cvBio: cvData.bio || worker?.workerProfile?.bio,
    } : {})
  };

  const application = await Application.create({
    job: jobId,
    worker: workerId,
    employer: job.employer,
    status: 'pending',
    source: isAutoApply ? 'AI' : source,
    message: message || '',
    appliedByAI: isAutoApply,
    matchScore: matchScore || (isAutoApply ? 85 : 0),
    includeCv,
    workerSnapshot: snapshot
  });

  const notifType = isAutoApply ? 'AI_AGENT' : 'APPLICATION';
  await sendRealTimeNotification(io, job.employer, {
    title: isAutoApply ? 'Sira AI Match' : 'New Application',
    message: isAutoApply
      ? `AI matched a worker for "${job.title}"`
      : `New application received for "${job.title}" from ${worker?.fullName || 'a worker'}`,
    jobId: job._id,
    type: notifType,
    workerId: workerId,
    additionalData: isAutoApply ? { action: 'view_agent', matchScore } : { action: 'view_applications' }
  });

  await sendRealTimeNotification(io, workerId, {
    title: 'Application Submitted',
    message: `Your application for "${job.title}" has been submitted successfully.`,
    jobId: job._id,
    type: 'APPLICATION',
    additionalData: { action: 'view_job' }
  });

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
      status: 'hired',
      worker: application.worker._id
    });

    const contract = await Contract.create({
      employerId: job.employer,
      workerId: application.worker._id,
      jobId: job._id,
      agreedAmount: req.customAgreedAmount || job.salary,
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
    title: status === 'accepted' ? "You're Hired" : 'Application Update',
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

export const getWorkerHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const applications = await Application.find({ worker: userId })
    .populate('job', 'title salary location status paymentType')
    .populate('employer', 'fullName email phone')
    .sort({ createdAt: -1 });

  const completedJobs = applications.filter(a => a.status === 'completed');

  const contracts = await Contract.find({ workerId: userId })
    .populate('jobId', 'title salary location status')
    .populate('employerId', 'fullName')
    .sort({ createdAt: -1 });

  const ratings = await Rating.find({ to: userId })
    .populate('from', 'fullName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: {
      applications,
      completedJobs,
      contracts,
      ratings
    }
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

  await sendJobCompleteNotification(
    req.io,
    contract.employerId,
    req.user?.fullName || 'Worker',
    contract.jobId.title,
    contract.jobId._id
  );

  await sendRealTimeNotification(req.io, req.user._id, {
    title: 'Job Marked Complete',
    message: `You have marked "${contract.jobId.title}" as finished. The employer will review and close.`,
    type: 'JOB_COMPLETE',
    jobId: contract.jobId._id,
    contractId: contract._id,
    additionalData: { action: 'view_job' }
  });

  res.status(200).json({
    success: true,
    message: 'Contract marked as finished successfully',
    data: contract
  });
});

export const hireWorker = asyncHandler(async (req, res) => {
  req.body.status = 'accepted';
  // Pass agreedAmount through for contract creation
  if (req.body.agreedAmount) {
    req.customAgreedAmount = req.body.agreedAmount;
  }
  return updateApplicationStatus(req, res);
});