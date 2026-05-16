import asyncHandler from '../utils/asyncHandler.js';

import {
  analyzeJobForScam,
  extractProfileFromText,
  processTextToData
} from '../services/aiService.js';

import { transcribeAudio } from '../services/voiceService.js';
import { createApplicationLogic } from './applicationController.js';
import { processNewJobMatches } from './jobController.js';

import Job from '../models/Job.js';
import User from '../models/User.js';

/**
 * 🎤 FAST VOICE PIPELINE
 * audio → transcription → AI (text only)
 * NO AUTH LOGIC
 */
export const processVoiceAction = asyncHandler(async (req, res) => {
  let text = req.body.transcript;
  let detectedLang = req.body.language || 'unknown';

  if (req.file) {
    const transcription = await transcribeAudio(req.file.path);
    text = transcription.text;
  }

  if (!text) {
    return res.json({
      success: false,
      transcript: '',
      aiInterpreted: {},
      actionTaken: 'NO_SPEECH'
    });
  }

  const intent = await processTextToData(text);

  const response = {
    transcript: text,
    language: detectedLang,
    aiInterpreted: intent,
    actionTaken: '',
    data: []
  };

  /**
   * 🟢 POST JOB (EMPLOYER ONLY)
   */
  if (intent.intent === 'post' && req.user?.role === 'employer') {
    const job = await Job.create({
      employer: req.user._id,
      title: intent.category
        ? `${intent.category} Job`
        : 'New Job',
      category: intent.category || 'General',
      description: text,
      salary: intent.salary || 0,
      location: {
        address: intent.location || 'Addis Ababa',
        type: 'Point',
        coordinates: [38.7578, 8.9806]
      },
      status: 'open'
    });

    await processNewJobMatches(job, req.io);

    response.actionTaken = 'JOB_CREATED';
    response.data = job;
  }

  /**
   * 🟡 APPLY (WORKER ONLY)
   */
  else if (intent.intent === 'apply' && req.user?.role === 'worker') {
    const jobId = req.body.jobId;

    if (!jobId) {
      return res.json({
        success: false,
        actionTaken: 'ERROR',
        error: 'Missing jobId'
      });
    }

    const application = await createApplicationLogic(
      jobId,
      req.user._id,
      req.io,
      false
    );

    response.actionTaken = 'JOB_APPLICATION_CREATED';
    response.data = {
      applicationId: application._id,
      jobId
    };
  }

  /**
   * 🔵 SEARCH JOBS
   */
  else if (intent.intent === 'search') {
    const jobs = await Job.find({
      $or: [
        {
          category: {
            $regex: intent.category || '',
            $options: 'i'
          }
        },
        {
          title: {
            $regex: intent.category || '',
            $options: 'i'
          }
        }
      ]
    })
      .limit(10)
      .populate('employer', 'fullName');

    response.actionTaken = 'JOB_SEARCH_RESULTS';
    response.data = jobs;
  }

  /**
   * 🟣 PROFILE UPDATE (VOICE CV ONLY)
   */
  else if (intent.intent === 'profile' && req.user) {
    const user = await User.findById(req.user._id);

    if (user && user.role === 'worker') {
      user.workerProfile.skills = [
        ...new Set([
          ...(user.workerProfile.skills || []),
          ...(intent.skills || [])
        ])
      ];

      user.workerProfile.bio =
        intent.summary || user.workerProfile.bio;

      await user.save();

      response.actionTaken = 'PROFILE_UPDATED';
      response.data = user.workerProfile;
    }
  }

  return res.json(response);
});

/**
 * 🔍 VOICE JOB SEARCH ONLY
 */
export const voiceJobSearch = asyncHandler(async (req, res) => {
  let text = req.body.transcript;

  if (req.file) {
    const transcription = await transcribeAudio(req.file.path);
    text = transcription.text;
  }

  if (!text) {
    return res.json({
      success: false,
      jobs: []
    });
  }

  const intent = await processTextToData(text);

  const jobs = await Job.find({
    $or: [
      {
        category: {
          $regex: intent.category || '',
          $options: 'i'
        }
      },
      {
        title: {
          $regex: intent.category || '',
          $options: 'i'
        }
      }
    ]
  })
    .limit(10)
    .populate('employer', 'fullName');

  res.json({
    aiInterpreted: intent,
    jobs
  });
});

/**
 * 🎤 VOICE CV BUILDER (ONLY FEATURE YOU KEEP)
 */
export const processVoiceCV = asyncHandler(async (req, res) => {
  let text = req.body.transcript;
  let voiceUrl = '';

  if (req.file) {
    const transcription = await transcribeAudio(req.file.path);
    text = transcription.text;
    voiceUrl = `/uploads/${req.file.filename}`;
  }

  if (!text) {
    return res.json({
      success: false,
      message: 'No profile data'
    });
  }

  const extracted = await extractProfileFromText(text);

  const update = {
    'workerProfile.rawVoiceTranscript': text,
    'workerProfile.skills': extracted.skills || [],
    'workerProfile.bio': extracted.bio || '',
    'workerProfile.preferredLanguage': 'amharic'
  };

  if (voiceUrl) {
    update['workerProfile.voiceUrl'] = voiceUrl;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: update },
    { new: true }
  );

  res.json({
    success: true,
    transcript: text,
    profile: user.workerProfile
  });
});

/**
 * ⚠️ JOB SAFETY CHECK
 */
export const checkJobSafety = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found'
    });
  }

  const report = await analyzeJobForScam(job.description);

  res.json({
    success: true,
    analysis: report
  });
});