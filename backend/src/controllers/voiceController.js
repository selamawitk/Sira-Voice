import asyncHandler from '../utils/asyncHandler.js';
import {
  analyzeJobForScam,
  extractWorkerProfileFromText,
  extractJobFromText,
  processRatingFromVoice,
  generateSuggestions,
  enhanceJobSearchWithRanking,
  processTextToData,
} from '../services/aiService.js';
import {
  processWorkerVoiceToCV,
  processEmployerVoiceToJob,
} from '../services/voiceService.js';
import { processIntent } from '../services/voiceActionService.js';
import { processNewJobMatches } from './jobController.js';
import { findMatchingWorkers } from '../services/jobMatcher.js';
import { transcribeAudio } from '../services/voiceService.js';
import { sendScamAlertNotification } from '../services/notificationService.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import ScamAnalysis from '../models/ScamAnalysis.js';

export const processVoiceAction = asyncHandler(async (req, res) => {
  let text = req.body.text || req.body.transcript || '';

  if (req.file) {
    const transcription = await transcribeAudio(req.file.path);
    text = transcription.text;
  }

  const result = await processIntent({
    text,
    detectedLang: req.body.lang || req.body.language || 'en',
    user: req.user,
    jobId: req.body.jobId,
  });

  if (result.actionTaken === 'JOB_CREATED' && req.io) {
    await processNewJobMatches(result.data, req.io);

    if (result.scamCheck && !result.scamCheck.isSafe) {
      sendScamAlertNotification(
        req.io,
        req.user._id,
        'Job Flagged — Review Required',
        `Your job "${result.data?.title}" was flagged by AI (risk: ${result.scamCheck.score}/100). ${result.scamCheck.reason}`,
        result.data?._id
      );
      try {
        await ScamAnalysis.create({
          jobId: result.data?._id,
          isSafe: result.scamCheck.isSafe,
          score: result.scamCheck.score,
          reason: result.scamCheck.reason,
          flags: result.scamCheck.flags || [],
          analyzedAt: new Date(),
        });
      } catch (err) {
        console.error('Scam analysis save failed:', err.message);
      }
    }
  }

  return res.json({ success: true, ...result });
});

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
    .limit(20)
    .populate('employer', 'fullName');

  const rankings = await enhanceJobSearchWithRanking(text, jobs, detectedLang);
  const rankedJobs = jobs.map((job, i) => {
    const rank = rankings.find(r => r.index === i) || {};
    return {
      ...job.toObject(),
      matchScore: rank.matchScore || 50,
      matchReasons: rank.reasons || ['Available job'],
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  res.json({ success: true, transcript: text, aiInterpreted: intent, jobs: rankedJobs });
});

export const processVoiceCVPreview = asyncHandler(async (req, res) => {
  const filePath = req.file?.path;
  const text = req.body.text || req.body.transcript || '';

  if (filePath) {
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
    'workerProfile.availability': profile.availability || 'not specified',
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

export const processVoiceJobCreate = asyncHandler(async (req, res) => {
  const { transcript, job: jobData, detectedLanguage } = req.body;

  if (!jobData || !jobData.jobTitle) {
    return res.status(400).json({ success: false, message: 'Invalid job data' });
  }

  const scamCheck = await analyzeJobForScam(transcript || jobData.description || '');

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
    isAiFlagged: !scamCheck.isSafe,
    aiRiskScore: scamCheck.score,
    aiAnalysis: scamCheck,
    status: 'open',
  });

  await processNewJobMatches(job, req.io);

  if (!scamCheck.isSafe) {
    sendScamAlertNotification(
      req.io,
      req.user._id,
      'Job Flagged — Review Required',
      `Your job "${job.title}" was flagged by AI (risk: ${scamCheck.score}/100). ${scamCheck.reason}`,
      job._id
    );
    try {
      await ScamAnalysis.create({
        jobId: job._id,
        isSafe: scamCheck.isSafe,
        score: scamCheck.score,
        reason: scamCheck.reason,
        flags: scamCheck.flags || [],
        analyzedAt: new Date(),
      });
    } catch (err) {
      console.error('Scam analysis save failed:', err.message);
    }
  }

  res.json({ success: true, job, scamCheck });
});

export const processVoiceRating = asyncHandler(async (req, res) => {
  const text = req.body.text || req.body.transcript || '';
  const detectedLang = req.body.lang || 'en';

  if (!text.trim()) {
    return res.status(400).json({ success: false, message: 'No rating text provided' });
  }

  const extracted = await processRatingFromVoice(text, detectedLang);

  if (!extracted.targetName || !extracted.rating) {
    return res.json({ success: false, message: 'Could not extract rating from voice', extracted });
  }

  const targetUser = await User.findOne({
    $or: [
      { fullName: { $regex: extracted.targetName, $options: 'i' } },
      { fullName: { $regex: extracted.targetName.split(' ')[0], $options: 'i' } },
    ],
  });

  if (!targetUser) {
    return res.json({ success: false, message: 'Could not find user to rate', targetName: extracted.targetName });
  }

  res.json({
    success: true,
    extracted,
    targetUserId: targetUser._id,
    message: 'Voice rating extracted. Submit via /ratings to save.',
  });
});

export const processVoiceSuggestions = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'worker';
  let suggestions = [];

  if (role === 'worker') {
    const user = await User.findById(req.user._id);
    suggestions = await generateSuggestions('worker', user?.workerProfile || {});
  } else if (role === 'employer') {
    const jobId = req.body.jobId;
    if (jobId) {
      const job = await Job.findById(jobId);
      suggestions = await generateSuggestions('employer', {}, job);
    }
  }

  res.json({ success: true, suggestions });
});

export const voiceJobMatchesWithReasons = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  const matches = await findMatchingWorkers(job);

  const matchesWithReasons = matches.map(m => ({
    ...m,
    matchScore: m.score,
    matchReasons: m.reasons || [],
  }));

  res.json({ success: true, jobTitle: job.title, matches: matchesWithReasons });
});

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
      'workerProfile.availability': profile.availability || 'not specified',
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
    'workerProfile.availability': profile.availability || 'not specified',
    'workerProfile.category': profile.skill || '',
  };

  if (profile.location) update['location.city'] = profile.location;

  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
  res.json({ success: true, transcript: text, profile: user.workerProfile });
});

export const checkJobSafety = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  const report = await analyzeJobForScam(job.description);
  res.json({ success: true, analysis: report });
});
