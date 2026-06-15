import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';
import passport from 'passport';
import OTP from '../models/OTP.js';
import { sendSms } from '../services/smsService.js';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || `http://${RP_ID}:5173`;

export const generatePasskeyRegistration = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const options = await generateRegistrationOptions({
    rpName: 'Sira Platform',
    rpID: RP_ID,
    userID: isoUint8Array.fromUTF8String(user._id.toString()),
    userName: user.email || user.phone || user.fullName,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
  });

  user.currentChallenge = options.challenge;
  await user.save();

  res.status(200).json(options);
});

export const verifyPasskeyRegistration = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const expectedChallenge = user.currentChallenge;

  const verification = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (verification.verified) {
    const { registrationInfo } = verification;
    user.passkey = {
      credentialID: Buffer.from(registrationInfo.credentialID).toString('base64url'),
      publicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64url'),
      counter: registrationInfo.counter,
      transports: req.body.response.transports,
    };
    user.currentChallenge = undefined;
    await user.save();
    res.status(200).json({ success: true });
  } else {
    res.status(400);
    throw new Error('Registration verification failed');
  }
});

export const generatePasskeyLoginOptions = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone: phone.trim() });

  if (!user || !user.passkey || !user.passkey.credentialID) {
    res.status(404);
    throw new Error('No biometric credentials found for this user');
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: [{
      id: user.passkey.credentialID,
      type: 'public-key',
      transports: user.passkey.transports,
    }],
    userVerification: 'required',
  });

  user.currentChallenge = options.challenge;
  await user.save();

  res.status(200).json(options);
});

export const verifyPasskeyLogin = asyncHandler(async (req, res) => {
  const { phone, body } = req.body;
  const user = await User.findOne({ phone: phone.trim() });
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const expectedChallenge = user.currentChallenge;

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: user.passkey.credentialID,
      credentialPublicKey: Buffer.from(user.passkey.publicKey, 'base64url'),
      counter: user.passkey.counter,
    },
  });

  if (verification.verified) {
    user.passkey.counter = verification.authenticationInfo.newCounter;
    user.currentChallenge = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        token: generateToken(user),
      }
    });
  } else {
    res.status(400);
    throw new Error('Biometric authentication failed');
  }
});

export const googleAuth = (req, res, next) => {
  const { role } = req.query;
  const state = role ? Buffer.from(JSON.stringify({ role })).toString('base64') : undefined;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state: state
  })(req, res, next);
};

export const googleAuthCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`,
});

export const googleAuthSuccess = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`);
  }

  let targetRole = 'worker';
  if (req.query.state) {
    try {
      const decodedState = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
      if (decodedState.role) targetRole = decodedState.role;
    } catch (e) {
      console.error("State decoding error:", e);
    }
  }

  const user = await User.findById(req.user._id);

  if (user && (!user.role || user.role === 'user')) {
    user.role = targetRole;
    await user.save();
  }

  const token = generateToken(user);
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  const redirectPath = user.role === 'employer' ? '/employer-dashboard' : '/dashboard';
  res.redirect(`${frontendUrl}${redirectPath}?token=${token}`);
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.status(200).json({
    success: true,
    data: {
      token: generateToken(user),
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, phone, email, password, role } = req.body;

  if (!fullName || !phone || !password) {
    res.status(400);
    throw new Error('Full name, phone and password are required');
  }

  const normalizedPhone = phone.trim();

  const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
  if (existingPhoneUser) {
    res.status(400);
    throw new Error('User already exists with this phone number');
  }

  if (email) {
    const existingEmailUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingEmailUser) {
      res.status(400);
      throw new Error('User already exists with this email');
    }
  }

  const user = await User.create({
    fullName: fullName.trim(),
    phone: normalizedPhone,
    email: email ? email.toLowerCase().trim() : undefined,
    password,
    role: role || 'worker',
    isVerified: false,
    workerProfile: {},
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user),
    }
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ success: true, data: user });
});

export const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['worker', 'employer'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    data: { role: user.role },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone: phone.trim() });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await OTP.create({
    phone: phone.trim(),
    code,
    purpose: 'password_reset',
    expiresAt,
  });

  await sendSms({
    to: phone.trim(),
    message: `Sira: Your password reset code is ${code}. Valid for 10 minutes.`,
  });

  res.status(200).json({ success: true, message: 'OTP sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = req.body;

  const otp = await OTP.findOne({
    phone: phone.trim(),
    code,
    purpose: 'password_reset',
    expiresAt: { $gt: new Date() },
  });

  if (!otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOne({ phone: phone.trim() });

  user.password = newPassword;
  await user.save();

  await OTP.deleteMany({
    phone: phone.trim(),
    purpose: 'password_reset',
  });

  res.status(200).json({ success: true, message: 'Password reset successful' });
});