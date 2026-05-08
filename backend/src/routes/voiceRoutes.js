import express from 'express';
import { processText, transcribeVoice, voiceHire } from '../controllers/voiceController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

router.post('/process-text', protect, processText);
router.post('/transcribe', protect, upload.single('audio'), transcribeVoice);
router.post('/hire/:jobId', protect, upload.single('audio'), voiceHire);

export default router;
