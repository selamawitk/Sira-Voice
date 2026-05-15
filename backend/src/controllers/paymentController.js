import axios from 'axios';
import crypto from 'crypto';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendRealTimeNotification } from '../services/notificationService.js';

export const initializeChapa = asyncHandler(async (req, res) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    res.status(500);
    throw new Error('CHAPA_SECRET_KEY is required in .env to initialize Chapa transactions.');
  }
  if (!process.env.BACKEND_URL) {
    res.status(500);
    throw new Error('BACKEND_URL is required in .env for Chapa callback URLs.');
  }
  if (!process.env.FRONTEND_URL) {
    res.status(500);
    throw new Error('FRONTEND_URL is required in .env for Chapa return URLs.');
  }

  const { amount, purpose, workerId, jobId } = req.body;
  const employer = await User.findById(req.user._id);

  const tx_ref = `sira-${Date.now()}-${employer._id}`;

  const email = employer?.email || `${employer.phone}@sira.local`;

  const payload = {
    amount: amount.toString(),
    currency: "ETB",
    email,
    first_name: employer.fullName.split(' ')[0],
    last_name: employer.fullName.split(' ')[1] || "User",
    tx_ref: tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/payment-success`,
    "customization[title]": "Sira-Voice Payment",
    "customization[description]": `Payment for ${purpose}`
  };

  const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', payload, {
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (response.data.status !== 'success') {
    res.status(502);
    throw new Error('Chapa transaction initialization failed');
  }

  await Transaction.create({
    employer: employer._id,
    worker: workerId || null,
    job: jobId || null,
    amount,
    tx_ref,
    status: 'pending',
    purpose,
    chapaResponse: response.data
  });

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url || null,
    chapaResponse: response.data
  });
});

export const verifyChapaWebhook = asyncHandler(async (req, res) => {
  const hash = crypto
    .createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-chapa-signature']) {
    return res.status(401).send('Invalid Signature');
  }

  const { tx_ref, status } = req.body;

  if (status === 'success') {
    const transaction = await Transaction.findOneAndUpdate(
      { tx_ref },
      { status: 'completed' },
      { new: true }
    );

    if (transaction) {
      if (transaction.purpose === 'verification') {
        await User.findByIdAndUpdate(transaction.employer, { isVerified: true });
        
        await sendRealTimeNotification(req.io, transaction.employer, {
          title: "Account Verified! ✅",
          message: "You now have a verified badge. Your jobs will get more attention.",
          type: "verification"
        });
      }

      if (transaction.purpose.startsWith('subscription_')) {
        const planType = transaction.purpose.split('_')[1];
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
          { user: transaction.employer },
          {
            planType,
            status: 'active',
            startDate,
            endDate,
            features
          },
          { upsert: true, new: true }
        );

        // Update user premium status
        if (planType === 'pro') {
          await User.findByIdAndUpdate(transaction.employer, { 
            isPremium: true,
            isAgentActive: true,
            'workerProfile.agentPreferences.autoApply': true 
          });
        } else if (planType === 'business') {
          await User.findByIdAndUpdate(transaction.employer, { 
            isPremium: true,
            isVerified: true
          });
        }

        await sendRealTimeNotification(req.io, transaction.employer, {
          title: "Premium Subscription Activated! 🎉",
          message: `Welcome to ${planType.charAt(0).toUpperCase() + planType.slice(1)} plan. Enjoy your premium features!`,
          type: "subscription"
        });
      }

      if (transaction.purpose === 'job_payment' && transaction.worker) {
        await User.findByIdAndUpdate(transaction.worker, {
          $inc: { totalEarnings: transaction.amount }
        });

        await sendRealTimeNotification(req.io, transaction.worker, {
          title: "Payment Received! 💰",
          message: `You earned ${transaction.amount} ETB. Check your balance!`,
          jobId: transaction.job,
          type: "payment"
        });
      }
    }
  }

  res.status(200).send('Webhook Received');
});

export const getUserTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const transactions = await Transaction.find({
    $or: [{ employer: userId }, { worker: userId }]
  })
    .sort({ createdAt: -1 })
    .populate('employer', 'fullName phone')
    .populate('worker', 'fullName phone')
    .populate('job', 'title salary status');

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions
  });
});