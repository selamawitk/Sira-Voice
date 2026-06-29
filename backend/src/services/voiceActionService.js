import {
  processTextToData,
  enhanceJobSearchWithRanking,
  analyzeJobForScam,
  extractWorkerProfileFromText,
  extractJobFromText,
  processRatingFromVoice,
  generateSuggestions,
} from './aiService.js';
import { findMatchingWorkers } from './jobMatcher.js';
import { createApplicationLogic } from '../controllers/applicationController.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

export const processIntent = async ({ text, detectedLang = 'en', user, jobId }) => {
  if (!text || !text.trim()) {
    return { actionTaken: 'NO_SPEECH', data: [], transcript: '' };
  }

  const intent = await processTextToData(text, detectedLang);

  const response = {
    transcript: text,
    language: detectedLang,
    aiInterpreted: intent,
    actionTaken: '',
    data: [],
  };

  if (intent?.intent === 'post' && user?.role === 'employer') {
    const scamCheck = await analyzeJobForScam(text);
    const job = await Job.create({
      employer: user._id,
      title: intent.title || (intent.category ? `${intent.category} Job` : 'New Job'),
      category: intent.category || 'General',
      description: intent.description || text,
      salary: intent.salary || 0,
      paymentType: intent.paymentType || 'daily',
      quantity: intent.quantity || 1,
      location: {
        address: intent.location || 'Addis Ababa',
        type: 'Point',
        coordinates: intent.coordinates || [38.7578, 8.9806],
      },
      isAiFlagged: !scamCheck.isSafe,
      aiRiskScore: scamCheck.score,
      aiAnalysis: scamCheck,
      status: 'open',
    });

    response.actionTaken = 'JOB_CREATED';
    response.data = job;
    response.scamCheck = scamCheck;
  }

  else if (intent?.intent === 'apply' && user?.role === 'worker') {
    if (!jobId) {
      response.actionTaken = 'ERROR';
      response.error = 'Missing jobId';
      return response;
    }

    try {
      const application = await createApplicationLogic(jobId, user._id, null, false, 0, false, null, 'VOICE', '');
      response.actionTaken = 'APPLICATION_SUBMITTED';
      response.data = { applicationId: application._id, jobId };
    } catch (err) {
      response.actionTaken = 'ERROR';
      response.error = err.message || 'Application failed';
    }
  }

  else if (intent?.intent === 'search') {
    const jobs = await Job.find({
      $or: [
        { category: { $regex: intent.category || '', $options: 'i' } },
        { title: { $regex: intent.category || '', $options: 'i' } },
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

    response.actionTaken = 'JOB_SEARCH_RESULTS';
    response.data = rankedJobs;
  }

  else if (intent?.intent === 'profile' && user) {
    const userDoc = await User.findById(user._id);
    if (userDoc && userDoc.role === 'worker') {
      userDoc.workerProfile.skills = [...new Set([...(userDoc.workerProfile.skills || []), ...(intent.skills || [])])];
      userDoc.workerProfile.bio = intent.summary || userDoc.workerProfile.bio;
      userDoc.workerProfile.rawVoiceTranscript = text;
      userDoc.workerProfile.preferredLanguage = detectedLang;
      await userDoc.save();
      response.actionTaken = 'PROFILE_UPDATED';
      response.data = userDoc.workerProfile;
    }
  }

  else if (intent?.intent === 'hire' && user?.role === 'employer') {
    const ranked = await findMatchingWorkers({
      title: intent.category || '',
      category: intent.category || '',
      description: text,
      location: {
        coordinates: [38.7578, 8.9806],
        address: intent.location || 'Addis Ababa',
      },
    });
    response.actionTaken = 'WORKER_SEARCH_RESULTS';
    response.data = ranked.slice(0, 10);
  }

  else {
    response.actionTaken = 'TEXT_PROCESSED';
  }

  return response;
};

export { extractWorkerProfileFromText, extractJobFromText, processRatingFromVoice, generateSuggestions, analyzeJobForScam };
