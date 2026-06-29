import asyncHandler from '../utils/asyncHandler.js';

import {
  analyzeJobForScam,
  extractProfileFromText,
  processTextToData,
  enhanceJobSearchWithRanking,
} from '../services/aiService.js';

import { transcribeAudio } from '../services/voiceService.js';
import { processIntent } from '../services/voiceActionService.js';
import { processNewJobMatches } from './jobController.js';
import { sendScamAlertNotification } from '../services/notificationService.js';

import Job from '../models/Job.js';
import User from '../models/User.js';
import ScamAnalysis from '../models/ScamAnalysis.js';

export const processVoiceAction = asyncHandler(async (req, res) => {
  let text = req.body.transcript || req.body.text || '';
  const detectedLang = req.body.lang || req.body.language || 'en';

  if (req.file) {
    const transcription = await transcribeAudio(req.file.path);
    text = transcription.text;
  }

  const result = await processIntent({
    text,
    detectedLang,
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
  let text = req.body.transcript;
  const detectedLang = req.body.lang || 'en';

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

  res.json({
    success: true,
    transcript: text,
    aiInterpreted: intent,
    jobs: rankedJobs
  });
});

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
