import express from 'express';
import { 
  registerUser, 
  loginUser,
  getProfile,
  googleAuth,
  googleAuthCallback,
  googleAuthSuccess,
  voiceAuth
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Voice Authentication (Registration/Login)
router.post('/voice-auth', upload.single('audio'), voiceAuth);

// Register with optional Voice-to-CV audio file
router.post('/register', upload.single('audio'), registerUser);

// Standard Login
router.post('/login', loginUser);

// Google Auth
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback, googleAuthSuccess);

// Get current logged-in user details
router.get('/me', protect, getProfile);

export default router;