import axios from 'axios';
import crypto from 'crypto';

import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import Contract from '../models/Contract.js';
import Payment from '../models/Payment.js';

import asyncHandler from '../utils/asyncHandler.js';
import { sendRealTimeNotification, sendPaymentNotification } from '../services/notificationService.js';

/**
 * 🚀 INITIALIZE GENERAL CHAPA (Verification/Generic)
 */
export const initializeChapa = asyncHandler(async (req, res) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    res.status(500);
    throw new Error('Missing CHAPA_SECRET_KEY');
  }

  const { amount, purpose, workerId, jobId, contractId } = req.body;
  const employer = await User.findById(req.user._id);

  if (!employer) {
    res.status(404);
    throw new Error('Employer not found');
  }

  const tx_ref = `sira-${Date.now()}-${employer._id}`;
  const email = employer?.email || `${employer.phone}@sira.local`;

  const payload = {
    amount: amount.toString(),
    currency: 'ETB',
    email,
    first_name: employer.fullName?.split(' ')[0] || 'Sira',
    last_name: employer.fullName?.split(' ')[1] || 'User',
    tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/contracts?payment=success`, // Matches Frontend Router
    'customization[title]': 'Sira Voice Verification',
    'customization[description]': `Payment for ${purpose}`
  };

  const response = await axios.post(
    'https://api.chapa.co/v1/transaction/initialize',
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.status !== 'success') {
    res.status(500);
    throw new Error('Failed to initialize payment');
  }

  await Transaction.create({
    employer: employer._id,
    worker: workerId || null,
    contract: contractId || null,
    job: jobId || null,
    amount,
    tx_ref,
    purpose,
    status: 'pending'
  });

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url || null
  });
});

/**
 * 💰 PAY CONTRACT (THE ESCROW FLOW)
 */
export const payContract = asyncHandler(async (req, res) => {
  const { contractId } = req.body;

  const contract = await Contract.findById(contractId).populate('jobId').populate('workerId');

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  const employer = await User.findById(contract.employerId);
  if (!employer) {
    res.status(404);
    throw new Error('Employer not found');
  }

  const tx_ref = `contract-${Date.now()}-${contract._id}`;

  const payload = {
    amount: contract.agreedAmount.toString(),
    currency: 'ETB',
    email: employer.email || `${employer.phone}@sira.local`,
    first_name: employer.fullName?.split(' ')[0] || 'Sira',
    last_name: employer.fullName?.split(' ')[1] || 'User',
    tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/contracts?payment=success`, // Matches Frontend Router
    'customization[title]': 'Sira Job Payment',
    'customization[description]': `Payment for ${contract.jobId?.title || 'Job Service'}`
  };

  const response = await axios.post(
    'https://api.chapa.co/v1/transaction/initialize',
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.status !== 'success') {
    res.status(500);
    throw new Error('Payment initialization failed');
  }

  // Create Transaction Record
  await Transaction.create({
    employer: contract.employerId,
    worker: contract.workerId._id,
    contract: contract._id,
    job: contract.jobId?._id,
    amount: contract.agreedAmount,
    tx_ref,
    purpose: 'job_payment',
    status: 'pending'
  });

  // Update contract status to 'held' (Money is now in transit)
  contract.escrowStatus = 'held';
  await contract.save();

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url || null
  });
});

/**
 * ⚓ WEBHOOK (THE SOURCE OF TRUTH)
 */
export const verifyChapaWebhook = asyncHandler(async (req, res) => {
  const hash = crypto
    .createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-chapa-signature']) {
    return res.status(401).send('Invalid Signature');
  }

  const { tx_ref, status } = req.body;
  if (status !== 'success') return res.status(200).send('Ignored');

  const transaction = await Transaction.findOneAndUpdate(
    { tx_ref },
    { status: 'completed' },
    { new: true }
  );

  if (!transaction) return res.status(404).send('Transaction not found');

  // Handle Socket instance reliably
  const io = req.app.get('io');

  // 1. ACCOUNT VERIFICATION
  if (transaction.purpose === 'verification') {
    await User.findByIdAndUpdate(transaction.employer, { isVerified: true });
    sendRealTimeNotification(io, transaction.employer, {
      title: 'Account Verified ✅',
      message: 'Your employer account is now verified.',
      type: 'verification'
    });
  }

  // 2. SUBSCRIPTIONS
  if (transaction.purpose.startsWith('subscription_')) {
    const planType = transaction.purpose.split('_')[1];
    const durationDays = planType === 'business' ? 90 : 30;
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    await Subscription.findOneAndUpdate(
      { user: transaction.employer },
      { planType, status: 'active', endDate },
      { upsert: true }
    );

    await User.findByIdAndUpdate(transaction.employer, { isPremium: true });

    sendRealTimeNotification(io, transaction.employer, {
      title: 'Subscription Activated 🎉',
      message: `Your ${planType} plan is now active.`,
      type: 'subscription'
    });
  }

  // 3. JOB PAYMENTS (ESCROW RELEASE)
  if (transaction.purpose === 'job_payment') {
    const contract = await Contract.findById(transaction.contract).populate('jobId', 'title');
    const worker = await User.findById(transaction.worker);

    if (worker) {
      await User.findByIdAndUpdate(transaction.worker, {
        $inc: { totalEarnings: transaction.amount }
      });
    }

    if (contract) {
      await Contract.findByIdAndUpdate(contract._id, {
        status: 'paid',
        escrowStatus: 'released',
        paidAt: new Date(),
        paymentReference: tx_ref
      });

      // Create Payment record
      await Payment.create({
        employerId: transaction.employer,
        workerId: transaction.worker,
        jobId: contract.jobId?._id || transaction.job,
        contractId: contract._id,
        amount: transaction.amount,
        tx_ref,
        status: 'success',
        purpose: 'job_payment',
        isVerified: true,
        verifiedAt: new Date(),
        gatewayResponse: { chapa_transaction_id: tx_ref }
      });
    }

    // Send payment notification with enhanced metadata
    await sendPaymentNotification(
      io,
      transaction.worker,
      transaction.amount,
      contract?.jobId?.title || 'Job Service',
      transaction.contract
    );
  }

  res.status(200).send('Webhook processed');
});

/**
 * 📜 HISTORY
 */
export const getUserTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({
    $or: [{ employer: req.user._id }, { worker: req.user._id }]
  })
    .populate('employer', 'fullName')
    .populate('worker', 'fullName')
    .populate('job', 'title')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: transactions
  });
});

/**
 * GET payments for employer
 */
export const getEmployerPayments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payments = await Payment.find({ employerId: id })
    .populate('workerId', 'fullName workerProfile')
    .populate('jobId', 'title')
    .populate('contractId', 'agreedAmount status')
    .sort({ createdAt: -1 });

  const total = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);

  res.status(200).json({
    success: true,
    data: payments,
    total,
    count: payments.length
  });
});

/**
 * GET payments for worker
 */
export const getWorkerPayments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payments = await Payment.find({ workerId: id })
    .populate('employerId', 'fullName')
    .populate('jobId', 'title')
    .populate('contractId', 'agreedAmount')
    .sort({ createdAt: -1 });

  const total = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);

  res.status(200).json({
    success: true,
    data: payments,
    total,
    count: payments.length
  });
});
