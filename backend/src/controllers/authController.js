import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';
import { extractProfileFromText, processVoiceToData } from '../services/aiService.js';
import passport from 'passport';

/* =========================
   🎤 VOICE AUTH
========================= */
export const voiceAuth = asyncHandler(async (req, res) => {
  let text = req.body.transcript;
  const action = req.body.action || 'login';

  if (req.file) {
    const result = await processVoiceToData(req.file.path);
    text = result?.transcript;
  }

  if (!text) {
    res.status(400);
    throw new Error('No voice input detected');
  }

  const extractedData = await extractProfileFromText(text);

  if (action === 'register') {
    const userExists = await User.findOne({ phone: extractedData.phone });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this phone number');
    }

    const user = await User.create({
      fullName: extractedData.name || "Voice User",
      phone: extractedData.phone || "0000000000",
      email: extractedData.email || `voice_${Date.now()}@sira.com`,
      password: Math.random().toString(36).slice(-8),
      role: 'worker',
      isVerified: true,
      workerProfile: {
        bio: extractedData.bio || "",
        skills: extractedData.skills || [],
        rawVoiceTranscript: text
      }
    });

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user),
      message: 'Voice registration successful'
    });

  } else {
    let user = null;

    if (extractedData.phone) {
      user = await User.findOne({ phone: extractedData.phone });
    }

    if (!user && extractedData.email) {
      user = await User.findOne({ email: extractedData.email });
    }

    if (!user) {
      const users = await User.find({ role: 'worker' });

      for (const u of users) {
        const skillMatch = extractedData.skills?.some(skill =>
          u.workerProfile?.skills?.includes(skill)
        );

        if (skillMatch) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      res.status(401);
      throw new Error('Voice not recognized. Please register first.');
    }

    user.workerProfile.lastVoiceLogin = new Date();
    await user.save();

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user),
      message: 'Voice login successful'
    });
  }
});

/* =========================
   👤 GET PROFILE (FIXED)
========================= */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isAgentActive: user.isAgentActive,
    workerProfile: user.workerProfile,
    employerProfile: user.employerProfile
  });
});

/* =========================
   👤 REGISTER
========================= */
export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, phone, email, password, role } = req.body;
  let transcript = req.body.transcript;

  if (req.file) {
    const result = await processVoiceToData(req.file.path);
    transcript = result?.transcript;
  }

  const userExists = await User.findOne({ phone });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  let workerProfile = {};

  if (role === 'worker' && transcript) {
    const extractedData = await extractProfileFromText(transcript);

    workerProfile = {
      skills: extractedData.skills || [],
      experienceYears: extractedData.experienceYears || 0,
      bio: extractedData.bio || "",
      preferredLanguage: extractedData.preferredLanguage || 'amharic',
      rawVoiceTranscript: transcript
    };
  }

  const user = await User.create({
    fullName,
    phone,
    email,
    password,
    role,
    workerProfile
  });

  res.status(201).json({
    _id: user._id,
    fullName: user.fullName,
    role: user.role,
    token: generateToken(user),
  });
});

/* =========================
   🔐 LOGIN
========================= */
export const loginUser = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user),
    });
  } else {
    res.status(401);
    throw new Error('Invalid phone or password');
  }
});

/* =========================
   🔐 GOOGLE AUTH
========================= */
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleAuthCallback = passport.authenticate('google', {
  failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
});

export const googleAuthSuccess = asyncHandler(async (req, res) => {
  const token = generateToken(req.user);

  res.redirect(
    `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${token}`
  );
});