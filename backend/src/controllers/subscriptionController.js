import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios';
import crypto from 'crypto';
import { sendRealTimeNotification } from '../services/notificationService.js';

const PLAN_PRICES = {
  basic: 0,
  pro: 500, // ETB
  business: 1500 // ETB
};

export const subscribe = asyncHandler(async (req, res) => {
  const { planType } = req.body; // 'basic', 'pro', 'business'
  const userId = req.user._id;

  if (!PLAN_PRICES[planType]) {
    res.status(400);
    throw new Error('Invalid plan type');
  }

  // If basic plan, no payment needed
  if (planType === 'basic') {
    const subscription = await Subscription.findOneAndUpdate(
      { user: userId },
      {
        planType,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        features: []
      },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(userId, { 
      isPremium: false,
      isAgentActive: false
    });

    await sendRealTimeNotification(req.io, userId, {
      title: "Subscription Updated! 📋",
      message: "You are now on the Basic plan.",
      type: "subscription"
    });

    return res.status(200).json({ success: true, data: subscription });
  }

  // For paid plans, initialize Chapa payment
  if (!process.env.CHAPA_SECRET_KEY) {
    res.status(500);
    throw new Error('Payment system not configured');
  }

  const amount = PLAN_PRICES[planType];
  const tx_ref = `sira-sub-${Date.now()}-${userId}`;

  const user = await User.findById(userId);
  const email = user?.email || `${user.phone}@sira.local`;

  const payload = {
    amount: amount.toString(),
    currency: "ETB",
    email,
    first_name: user.fullName.split(' ')[0],
    last_name: user.fullName.split(' ')[1] || "User",
    tx_ref: tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/subscription-success`,
    "customization[title]": "Sira-Voice Subscription",
    "customization[description]": `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan Subscription`
  };

  const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', payload, {
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (response.data.status !== 'success') {
    res.status(502);
    throw new Error('Payment initialization failed');
  }

  // Create pending transaction
  await Transaction.create({
    employer: userId,
    amount,
    tx_ref,
    status: 'pending',
    purpose: `subscription_${planType}`,
    chapaResponse: response.data
  });

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url,
    planType,
    amount
  });
});

export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  
  if (!subscription) {
    return res.json({ status: 'none', message: 'No active subscription' });
  }

  res.json(subscription);
});