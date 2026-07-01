import express from 'express';

import {
  processVoiceAction,
  voiceJobSearch,
  processVoiceCV,
  processVoiceCVPreview,
  processVoiceCVSave,
  processVoiceJobPreview,
  processVoiceJobCreate,
  processVoiceRating,
  processVoiceSuggestions,
  voiceJobMatchesWithReasons,
  checkJobSafety,
  generateCV,
} from '../controllers/voiceController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';
import { processIntent } from '../services/voiceActionService.js';

const router = express.Router();

router.post('/voice-action', protect, upload.single('audio'), processVoiceAction);

router.post('/voice-search', protect, upload.single('audio'), voiceJobSearch);

router.post('/process-cv', protect, upload.single('audio'), processVoiceCV);
router.post('/cv-preview', protect, upload.single('audio'), processVoiceCVPreview);
router.post('/cv-save', protect, processVoiceCVSave);

router.post('/job-preview', protect, upload.single('audio'), processVoiceJobPreview);
router.post('/job-create', protect, processVoiceJobCreate);

router.post('/voice-rating', protect, processVoiceRating);

router.post('/suggestions', protect, processVoiceSuggestions);

router.get('/matches/:jobId', protect, voiceJobMatchesWithReasons);

router.post('/generate-cv', protect, generateCV);

router.post('/process-text', protect, async (req, res, next) => {
  try {
    req.body.transcript = req.body.text;
    return processVoiceAction(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.get('/safety/:jobId', protect, checkJobSafety);

router.post('/transcribe', protect, upload.single('audio'), async (req, res) => {
  try {
    const text = req.body.text || req.body.transcript || '';
    const lang = req.body.lang || 'en';
    res.json({ success: true, text, language: lang, transcript: text });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Transcription failed' });
  }
});

router.post('/hire/:jobId', protect, async (req, res) => {
  try {
    const { text, lang } = req.body;
    const result = await processIntent({ text, detectedLang: lang || 'en', user: req.user, jobId: req.params.jobId });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
