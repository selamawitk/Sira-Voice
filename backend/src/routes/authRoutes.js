import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  registerUser,
  loginUser,
  getProfile,
  googleAuth,
  googleAuthCallback,
  googleAuthSuccess,
  forgotPassword,
  resetPassword,
  setUserRole,
  generatePasskeyRegistration,
  verifyPasskeyRegistration,
  generatePasskeyLoginOptions,
  verifyPasskeyLogin,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/passkey/register-options',
  protect,
  generatePasskeyRegistration
);

router.post(
  '/passkey/verify-registration',
  protect,
  verifyPasskeyRegistration
);

router.post(
  '/passkey/login-options',
  authLimiter,
  generatePasskeyLoginOptions
);

router.post(
  '/passkey/verify-login',
  authLimiter,
  verifyPasskeyLogin
);

router.post(
  '/register',
  authLimiter,
  registerUser
);

router.post(
  '/login',
  authLimiter,
  loginUser
);

router.get(
  '/google',
  googleAuth
);

router.get(
  '/google/callback',
  googleAuthCallback,
  googleAuthSuccess
);

router.get(
  '/me',
  protect,
  getProfile
);

router.post(
  '/set-role',
  protect,
  setUserRole
);

router.post(
  '/forgot-password',
  otpLimiter,
  forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  resetPassword
);

export default router;