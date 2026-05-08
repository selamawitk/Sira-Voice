import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const subscribe = asyncHandler(async (req, res) => {
  const { planType } = req.body; // 'basic', 'pro', 'business'
  const userId = req.user._id;

  let durationDays = 30;
  let features = [];

  if (planType === 'pro') {
    features = ['auto_apply', 'unlimited_matches', 'priority_support'];
    durationDays = 30;
  } else if (planType === 'business') {
    features = ['unlimited_job_posts', 'verified_badge', 'analytics'];
    durationDays = 90;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  const subscription = await Subscription.findOneAndUpdate(
    { user: userId },
    {
      planType,
      status: 'active',
      startDate,
      endDate,
      features
    },
    { upsert: true, new: true }
  );

  // If worker unlocks Pro, automatically enable their AI Agent
  if (planType === 'pro') {
    await User.findByIdAndUpdate(userId, { 
      isPremium: true,
      isAgentActive: true,
      'workerProfile.agentPreferences.autoApply': true 
    });
  }

  res.status(200).json({ success: true, data: subscription });
});

export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  
  if (!subscription) {
    return res.json({ status: 'none', message: 'No active subscription' });
  }

  res.json(subscription);
});