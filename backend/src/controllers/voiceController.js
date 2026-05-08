import asyncHandler from '../utils/asyncHandler.js';

import {
  processTextToData,
  processVoiceToData,
} from '../services/aiService.js';

import { sendSms } from '../services/smsService.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Notification from '../models/Notification.js';

/* =========================
   🧠 TEXT → AI
========================= */
export const processText = asyncHandler(async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || transcript.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Transcript is required',
    });
  }

  try {
    const parsed = await processTextToData(transcript);

    return res.status(200).json({
      success: true,
      intent: parsed?.intent || 'search',
      details: parsed?.summary || transcript,
      location: parsed?.location || '',
      detectedLanguage: parsed?.detectedLanguage || 'unknown',
      aiInterpreted: parsed || {},
    });

  } catch (error) {
    console.error('❌ TEXT ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Text processing failed',
    });
  }
});

/* =========================
   🎤 VOICE → AI (FAST PIPELINE)
========================= */
export const transcribeVoice = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file received',
    });
  }

  try {
    // 🎤 STEP 1: Voice → AI (FAST + SAFE)
    const result = await processVoiceToData(req.file.path);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Voice processing failed',
      });
    }

    // 📩 SMS (NON-BLOCKING SAFE CALL)
    const destinationPhone =
      req.user?.phone || process.env.AFRICASTALKING_TEST_NUMBER;

    if (destinationPhone) {
      sendSms({
        to: destinationPhone,
        message: `Sira Voice: ${result.intent || 'unknown'} | ${result.category || 'General'}`
      }).catch(err =>
        console.error('⚠️ SMS failed:', err.message)
      );
    }

    return res.status(200).json({
      success: true,
      transcript: result.transcript || '',
      intent: result.intent || 'search',
      category: result.category || '',
      location: result.location || '',
      skills: result.skills || [],
      summary: result.summary || '',
      detectedLanguage: result.detectedLanguage || 'unknown',
    });

  } catch (error) {
    console.error('❌ VOICE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Voice processing failed',
    });
  }
});

/* =========================
   🎤 VOICE HIRE (MATCH SYSTEM)
========================= */
export const voiceHire = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided',
    });
  }

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job ID is required',
    });
  }

  const job = await Job.findOne({
    _id: jobId,
    employer: req.user._id,
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found or permission denied',
    });
  }

  // 🎤 Voice AI
  const aiResult = await processVoiceToData(req.file.path);

  if (!aiResult) {
    return res.status(500).json({
      success: false,
      message: 'Voice processing failed',
    });
  }

  // ❌ Wrong intent guard
  if (aiResult.intent !== 'hire') {
    return res.status(400).json({
      success: false,
      message: `Detected intent: ${aiResult.intent || 'unknown'}`,
    });
  }

  const applications = await Application.find({ job: jobId })
    .populate('worker', 'fullName phone');

  const spokenText = (aiResult.transcript || '').toLowerCase();

  const match = applications.find(app => {
    const name = app.worker?.fullName?.toLowerCase();
    return name && spokenText.includes(name);
  });

  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Worker not found among applicants',
    });
  }

  // ✅ Accept worker
  match.status = 'accepted';
  await match.save();

  // 📩 SMS (non-blocking)
  if (match.worker?.phone) {
    sendSms({
      to: match.worker.phone,
      message: `🎉 You are hired for "${job.title}" via Sira Voice!`,
    }).catch(err =>
      console.error('⚠️ Worker SMS failed:', err.message)
    );
  }

  // 🔔 Notification (non-blocking)
  Notification.create({
    user: match.worker._id,
    message: `You have been hired for "${job.title}"`,
  }).catch(err =>
    console.error('⚠️ Notification failed:', err.message)
  );

  return res.status(200).json({
    success: true,
    message: `Successfully hired ${match.worker.fullName}`,
    hiredWorker: {
      id: match.worker._id,
      name: match.worker.fullName,
    },
    transcript: aiResult.transcript,
  });
});