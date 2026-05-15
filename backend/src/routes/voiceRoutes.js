import express from 'express';
import {
  processVoiceAction,
  voiceJobSearch,
  processVoiceCV,
  checkJobSafety
} from '../controllers/voiceController.js';

import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

/**
 * 🎤 MAIN VOICE ACTION
 * post job / apply / profile update / search
 */
router.post(
  '/action',
  protect,
  upload.single('audio'),
  processVoiceAction
);

/**
 * 🔍 VOICE JOB SEARCH ONLY
 */
router.post(
  '/search',
  protect,
  upload.single('audio'),
  voiceJobSearch
);

/**
 * 👤 VOICE CV GENERATION / UPDATE
 */
router.post(
  '/cv',
  protect,
  upload.single('audio'),
  processVoiceCV
);

/**
 * ⚠️ JOB SAFETY CHECK
 */
router.get(
  '/safety/:jobId',
  protect,
  checkJobSafety
);

export default router;