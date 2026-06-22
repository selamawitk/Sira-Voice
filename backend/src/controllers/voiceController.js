import asyncHandler from '../utils/asyncHandler.js';
import {
  analyzeJobForScam,
  processTextToData,
  extractWorkerProfileFromText,
  extractJobFromText,
} from '../services/aiService.js';
import {
  processWorkerVoiceToCV,
  processEmployerVoiceToJob,
  processVoiceToData,
} from '../services/voiceService.js';
import { createApplicationLogic } from './applicationController.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

/**
 * 🎤 TEXT-BASED VOICE ACTION
 * Browser SpeechRecognition → text → AI
 */
export const processVoiceAction = asyncHandler(async (req, res) => {
  const text = req.body.text || req.body.transcript || '';
  const detectedLang = req.body.lang || req.body.language || 'en';

  if (!text || !text.trim()) {
    return res.json({ success: false, transcript: '', aiInterpreted: {}, actionTaken: 'NO_SPEECH' });
  }

  const intent = await processTextToData(text, detectedLang);

  const response = {
    success: true,
    transcript: text,
    language: detectedLang,
    aiInterpreted: intent,
    actionTaken: '',
    data: [],
  };

  // 🟢 POST JOB
  if (intent?.intent === 'post' && req.user?.role === 'employer') {
    const job = await Job.create({
      employer: req.user._id,
      title: intent.title || (intent.category ? `${intent.category} Job` : 'New Job'),
      category: intent.category || 'General',
      description: intent.description || text,
      salary: intent.salary || 0,
      paymentType: intent.paymentType || 'daily',
      location: {
        address: intent.location || 'Addis Ababa',
        type: 'Point',
        coordinates: intent.coordinates || [38.7578, 8.9806],
      },
      status: 'open',
    });

    response.actionTaken = 'JOB_CREATED';
    response.data = job;
  }

  // 🟡 APPLY JOB
  else if (intent?.intent === 'apply' && req.user?.role === 'worker') {
    const jobId = req.body.jobId;
    if (!jobId) {
      return res.json({ success: false, actionTaken: 'ERROR', error: 'Missing jobId' });
    }

    const application = await createApplicationLogic(jobId, req.user._id, req.io, false);
    response.actionTaken = 'JOB_APPLICATION_CREATED';
    response.data = { applicationId: application._id, jobId };
  }

  // 🔵 SEARCH JOBS
  else if (intent?.intent === 'search') {
    const jobs = await Job.find({
      $or: [
        { category: { $regex: intent.category || '', $options: 'i' } },
        { title: { $regex: intent.category || '', $options: 'i' } },
      ],
    })
      .limit(10)
      .populate('employer', 'fullName');

    response.actionTaken = 'JOB_SEARCH_RESULTS';
    response.data = jobs;
  }

  // 🟣 PROFILE UPDATE
  else if (intent?.intent === 'profile' && req.user) {
    const user = await User.findById(req.user._id);
    if (user && user.role === 'worker') {
      user.workerProfile.skills = [...new Set([...(user.workerProfile.skills || []), ...(intent.skills || [])])];
      user.workerProfile.bio = intent.summary || user.workerProfile.bio;
      user.workerProfile.rawVoiceTranscript = text;
      user.workerProfile.preferredLanguage = detectedLang;
      await user.save();
      response.actionTaken = 'PROFILE_UPDATED';
      response.data = user.workerProfile;
    }
  }

  // 🟠 DEFAULT
  else {
    response.actionTaken = 'TEXT_PROCESSED';
  }

  return res.json(response);
});

/**
 * 🔍 TEXT JOB SEARCH
 */
export const voiceJobSearch = asyncHandler(async (req, res) => {
  const text = req.body.text || req.body.transcript || '';
  const detectedLang = req.body.lang || 'en';

  if (!text.trim()) {
    return res.json({ success: false, jobs: [] });
  }

  const intent = await processTextToData(text, detectedLang);

  const jobs = await Job.find({
    $or: [
      { category: { $regex: intent?.category || '', $options: 'i' } },
      { title: { $regex: intent?.category || '', $options: 'i' } },
    ],
  })
    .limit(10)
    .populate('employer', 'fullName');

  res.json({ success: true, transcript: text, aiInterpreted: intent, jobs });
});

/**
 * 🎤 VOICE → CV PIPELINE (with preview)
 * Step 1: Process audio → return transcript + extracted profile
 */
export const processVoiceCVPreview = asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  const text = req.body.text || req.body.transcript || '';

  if (filePath) {
    // Audio upload path
    const result = await processWorkerVoiceToCV(filePath);
    return res.json({
      success: true,
      transcript: result.transcript,
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage,
      profile: result.profile,
      isPreview: true,
    });
  }

  if (!text.trim()) {
    return res.json({ success: false, message: 'No audio or text provided' });
  }

  // Text path (manual keyboard fallback)
  const profile = await extractWorkerProfileFromText(text, req.body.lang || 'en');
  return res.json({
    success: true,
    transcript: text,
    translatedText: text,
    detectedLanguage: req.body.lang || 'en',
    profile,
    isPreview: true,
  });
});

/**
 * 🎤 VOICE → CV SAVE
 * Step 2: After preview/edit, save to user profile
 */
export const processVoiceCVSave = asyncHandler(async (req, res) => {
  const { transcript, translatedText, profile, detectedLanguage } = req.body;

  if (!profile) {
    return res.status(400).json({ success: false, message: 'No profile data to save' });
  }

  const update = {
    'workerProfile.rawVoiceTranscript': transcript || '',
    'workerProfile.skills': profile.skill ? [profile.skill] : [],
    'workerProfile.bio': translatedText || transcript || '',
    'workerProfile.preferredLanguage': detectedLanguage || 'am',
    'workerProfile.experienceYears': profile.experienceYears || 0,
    'workerProfile.category': profile.skill || '',
  };

  if (profile.location) {
    update['location.city'] = profile.location;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: update },
    { new: true }
  );

  res.json({ success: true, transcript, profile: user.workerProfile });
});

/**
 * 🎤 VOICE → JOB POSTING PREVIEW
 * Step 1: Process audio → return transcript + extracted job
 */
export const processVoiceJobPreview = asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  const text = req.body.text || req.body.transcript || '';

  if (filePath) {
    const result = await processEmployerVoiceToJob(filePath);
    return res.json({
      success: true,
      transcript: result.transcript,
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage,
      job: result.job,
      isPreview: true,
    });
  }

  if (!text.trim()) {
    return res.json({ success: false, message: 'No audio or text provided' });
  }

  const job = await extractJobFromText(text, req.body.lang || 'en');
  return res.json({
    success: true,
    transcript: text,
    translatedText: text,
    detectedLanguage: req.body.lang || 'en',
    job,
    isPreview: true,
  });
});

/**
 * 🎤 VOICE → JOB POSTING CREATE
 * Step 2: After preview/edit, create the job
 */
export const processVoiceJobCreate = asyncHandler(async (req, res) => {
  const { transcript, job: jobData, detectedLanguage } = req.body;

  if (!jobData || !jobData.jobTitle) {
    return res.status(400).json({ success: false, message: 'Invalid job data' });
  }

  const job = await Job.create({
    employer: req.user._id,
    title: jobData.jobTitle || 'New Job',
    category: jobData.jobTitle?.toLowerCase() || 'general',
    description: transcript || jobData.description || '',
    salary: jobData.salary || 0,
    paymentType: jobData.paymentType || 'daily',
    quantity: jobData.quantity || 1,
    location: {
      address: jobData.location || 'Addis Ababa',
      type: 'Point',
      coordinates: [38.7578, 8.9806],
    },
    status: 'open',
  });

  res.json({ success: true, job });
});

/**
 * 🎤 LEGACY VOICE CV (kept for backward compat)
 */
export const processVoiceCV = asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  const text = req.body.text || req.body.transcript || '';
  const detectedLang = req.body.lang || 'en';

  if (filePath) {
    const result = await processWorkerVoiceToCV(filePath);
    const { profile } = result;

    const update = {
      'workerProfile.rawVoiceTranscript': result.transcript || '',
      'workerProfile.skills': profile.skill ? [profile.skill] : [],
      'workerProfile.bio': result.translatedText || result.transcript || '',
      'workerProfile.preferredLanguage': detectedLang,
      'workerProfile.experienceYears': profile.experienceYears || 0,
      'workerProfile.category': profile.skill || '',
    };

    if (profile.location) {
      update['location.city'] = profile.location;
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    return res.json({ success: true, transcript: result.transcript, profile: user.workerProfile });
  }

  if (!text.trim()) {
    return res.json({ success: false, message: 'No profile data' });
  }

  const profile = await extractWorkerProfileFromText(text, detectedLang);
  const update = {
    'workerProfile.rawVoiceTranscript': text,
    'workerProfile.skills': profile.skill ? [profile.skill] : [],
    'workerProfile.bio': text,
    'workerProfile.preferredLanguage': detectedLang,
    'workerProfile.experienceYears': profile.experienceYears || 0,
    'workerProfile.category': profile.skill || '',
  };

  if (profile.location) update['location.city'] = profile.location;

  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
  res.json({ success: true, transcript: text, profile: user.workerProfile });
});

/**
 * ⚠️ JOB SAFETY CHECK
 */
export const checkJobSafety = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  const report = await analyzeJobForScam(job.description);
  res.json({ success: true, analysis: report });
});
