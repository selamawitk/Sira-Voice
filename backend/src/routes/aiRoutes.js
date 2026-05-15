import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  processVoiceAction, 
  processVoiceCV,
  voiceJobSearch, 
  checkJobSafety 
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Rate limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 AI requests per window
  message: 'Too many AI requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/voice-action', protect, aiLimiter, upload.single('audio'), processVoiceAction);

router.post('/process-cv', protect, aiLimiter, upload.single('audio'), processVoiceCV);

router.post('/voice-search', protect, aiLimiter, upload.single('audio'), voiceJobSearch);

router.get('/verify-safety/:jobId', protect, aiLimiter, checkJobSafety);

export default router;