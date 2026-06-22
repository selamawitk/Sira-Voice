import express from 'express';

import {
  processVoiceAction,
  voiceJobSearch,
  processVoiceCV,
  processVoiceCVPreview,
  processVoiceCVSave,
  processVoiceJobPreview,
  processVoiceJobCreate,
  checkJobSafety,
} from '../controllers/voiceController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// 🎤 Voice Action (text-based, general)
router.post('/voice-action', protect, processVoiceAction);

// 🔍 Voice Job Search
router.post('/voice-search', protect, upload.single('audio'), voiceJobSearch);

// 🎤 Voice → CV Pipeline
router.post('/process-cv', protect, upload.single('audio'), processVoiceCV);
router.post('/cv-preview', protect, upload.single('audio'), processVoiceCVPreview);
router.post('/cv-save', protect, processVoiceCVSave);

// 🎤 Voice → Job Posting Pipeline
router.post('/job-preview', protect, upload.single('audio'), processVoiceJobPreview);
router.post('/job-create', protect, processVoiceJobCreate);

// 📝 Text processing (for keyboard fallback)
router.post('/process-text', protect, async (req, res, next) => {
  try {
    req.body.transcript = req.body.text;
    return processVoiceAction(req, res, next);
  } catch (err) {
    next(err);
  }
});

// ⚠️ Job Safety Check
router.get('/safety/:jobId', protect, checkJobSafety);

export default router;
