import express from 'express';
import { 
  processVoiceAction, 
  processVoiceCV,
  voiceJobSearch, 
  checkJobSafety 
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

router.post('/voice-action', protect, upload.single('audio'), processVoiceAction);

router.post('/process-cv', protect, upload.single('audio'), processVoiceCV);

router.post('/voice-search', protect, upload.single('audio'), voiceJobSearch);

router.get('/verify-safety/:jobId', protect, checkJobSafety);

export default router;