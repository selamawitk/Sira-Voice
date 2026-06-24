import axios from 'axios';
import crypto from 'crypto';

import User from '../models/User.js';
import Job from '../models/Job.js';
import Transaction from '../models/Transaction.js';
import Contract from '../models/Contract.js';
import Payment from '../models/Payment.js';

import asyncHandler from '../utils/asyncHandler.js';
import { sendRealTimeNotification, sendPaymentNotification } from '../services/notificationService.js';

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
    return_url: `${process.env.FRONTEND_URL}/payment/success?tx_ref=${tx_ref}`,
    'customization[title]': 'Sira Voice Payment',
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
    return_url: `${process.env.FRONTEND_URL}/payment/success?tx_ref=${tx_ref}`,
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

  contract.escrowStatus = 'held';
  await contract.save();

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url || null
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

  const { tx_ref, status, first_name, last_name } = req.body;
  if (status !== 'success') return res.status(200).send('Ignored');

  const transaction = await Transaction.findOneAndUpdate(
    { tx_ref },
    { status: 'success', paidAt: new Date() },
    { new: true }
  );

  if (!transaction) return res.status(404).send('Transaction not found');

  const io = req.app.get('io');

  if (transaction.purpose === 'verification') {
    await User.findByIdAndUpdate(transaction.employer, { isVerified: true });
    sendRealTimeNotification(io, transaction.employer, {
      title: 'Account Verified',
      message: 'Your employer account is now verified.',
      type: 'verification'
    });
  }

  if (transaction.purpose === 'job_payment') {
    const worker = await User.findById(transaction.worker);
    if (worker) {
      await User.findByIdAndUpdate(transaction.worker, {
        $inc: { totalEarnings: transaction.amount }
      });
    }

    if (transaction.contract) {
      const contract = await Contract.findById(transaction.contract).populate('jobId', 'title');
      if (contract) {
        await Contract.findByIdAndUpdate(contract._id, {
          status: 'paid',
          escrowStatus: 'released',
          paidAt: new Date(),
          paymentReference: tx_ref
        });

        const existingPayment = await Payment.findOne({ tx_ref });
        if (!existingPayment) {
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

        if (contract.jobId?._id) {
          await Job.findByIdAndUpdate(contract.jobId._id, { isPaid: true, paidAt: new Date() });
        }
      }
    } else if (transaction.job) {
      const existingPayment = await Payment.findOne({ tx_ref });
      if (!existingPayment) {
        await Payment.create({
          employerId: transaction.employer,
          workerId: transaction.worker,
          jobId: transaction.job,
          contractId: null,
          amount: transaction.amount,
          tx_ref,
          status: 'success',
          purpose: 'job_payment',
          isVerified: true,
          verifiedAt: new Date(),
          gatewayResponse: { chapa_transaction_id: tx_ref }
        });
      }

      await Job.findByIdAndUpdate(transaction.job, { isPaid: true, paidAt: new Date() });
    }

    await sendPaymentNotification(
      io,
      transaction.worker,
      transaction.amount,
      transaction.purpose || 'Job Service',
      transaction.contract
    );

    sendRealTimeNotification(io, transaction.employer, {
      title: 'Payment Sent',
      message: `Your payment of ETB ${transaction.amount} has been processed successfully.`,
      type: 'PAYMENT',
      additionalData: { action: 'view_payments' }
    });
  }

  res.status(200).send('Webhook processed');
});

export const verifyChapaTransaction = asyncHandler(async (req, res) => {
  const { tx_ref } = req.body;

  if (!tx_ref) {
    res.status(400);
    throw new Error('Transaction reference is required');
  }

  try {
    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const chapaStatus = response.data?.data?.status;
    const isSuccess = chapaStatus === 'success';

    if (isSuccess) {
      const transaction = await Transaction.findOneAndUpdate(
        { tx_ref },
        { status: 'success', paidAt: new Date() },
        { new: true }
      );

      if (transaction && transaction.purpose === 'job_payment') {
        const io = req.app.get('io');

        const worker = await User.findById(transaction.worker);
        if (worker) {
          await User.findByIdAndUpdate(transaction.worker, {
            $inc: { totalEarnings: transaction.amount }
          });
        }

        const existingPayment = await Payment.findOne({ tx_ref });
        if (!existingPayment) {
          await Payment.create({
            employerId: transaction.employer,
            workerId: transaction.worker,
            jobId: transaction.job,
            contractId: transaction.contract,
            amount: transaction.amount,
            tx_ref,
            status: 'success',
            purpose: 'job_payment',
            isVerified: true,
            verifiedAt: new Date(),
            gatewayResponse: response.data
          });
        }

        if (transaction.job) {
          await Job.findByIdAndUpdate(transaction.job, { isPaid: true, paidAt: new Date() });
        }

        await sendPaymentNotification(
          io,
          transaction.worker,
          transaction.amount,
          transaction.purpose || 'Job Service',
          transaction.contract
        );
      }
    }

    res.status(200).json({
      success: isSuccess,
      data: response.data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Verification failed',
      error: error.response?.data || error.message
    });
  }
});

export const initiateJobPayment = asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  const job = await Job.findById(jobId).populate('worker', 'fullName email paymentProfile').populate('employer', 'fullName email phone');

  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  if (job.employer._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the job employer can initiate payment');
  }

  if (job.status !== 'completed') {
    res.status(400);
    throw new Error('Job must be completed before payment');
  }

  if (job.isPaid) {
    res.status(400);
    throw new Error('This job has already been paid');
  }

  if (!job.worker) {
    res.status(400);
    throw new Error('No worker assigned to this job');
  }

  const workerPaymentReady = job.worker?.paymentProfile?.paymentReady;
  if (workerPaymentReady === false) {
    res.status(400);
    throw new Error('Worker has not completed their payment information');
  }

  const amount = Number(job.salary) || 0;
  if (amount <= 0) {
    res.status(400);
    throw new Error('Invalid payment amount');
  }

  const employer = job.employer;
  const tx_ref = `jobpay-${job._id}-${Date.now()}`;
  const email = employer?.email || `${employer.phone}@sira.local`;

  const payload = {
    amount: amount.toString(),
    currency: 'ETB',
    email,
    first_name: employer.fullName?.split(' ')[0] || 'Sira',
    last_name: employer.fullName?.split(' ')[1] || 'User',
    tx_ref,
    callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/payment/success?tx_ref=${tx_ref}`,
    'customization[title]': `Sira Payment: ${job.title}`,
    'customization[description]': `Payment for ${job.title}`,
    meta: {
      jobId: job._id.toString(),
      workerId: job.worker._id.toString(),
      employerId: employer._id.toString()
    }
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
    throw new Error('Failed to initialize payment with Chapa');
  }

  const existingPayment = await Payment.findOne({ jobId: job._id, status: 'pending' });
  if (existingPayment) {
    await Payment.findByIdAndUpdate(existingPayment._id, { tx_ref, status: 'pending' });
  } else {
    await Payment.create({
      employerId: employer._id,
      workerId: job.worker._id,
      jobId: job._id,
      contractId: null,
      amount,
      currency: 'ETB',
      tx_ref,
      status: 'pending',
      purpose: 'job_payment'
    });
  }

  await Transaction.create({
    employer: employer._id,
    worker: job.worker._id,
    job: job._id,
    contract: null,
    amount,
    tx_ref,
    purpose: 'job_payment',
    status: 'pending'
  });

  res.status(200).json({
    success: true,
    checkoutUrl: response.data?.data?.checkout_url,
    tx_ref
  });
});

export const updatePaymentProfile = asyncHandler(async (req, res) => {
  const { bankName, accountName, accountNumber, stripeAccountId } = req.body;

  const updateData = {};
  if (bankName !== undefined) updateData['paymentProfile.bankName'] = bankName;
  if (accountName !== undefined) updateData['paymentProfile.accountName'] = accountName;
  if (accountNumber !== undefined) updateData['paymentProfile.accountNumber'] = accountNumber;
  if (stripeAccountId !== undefined) updateData['paymentProfile.stripeAccountId'] = stripeAccountId;

  const hasBank = bankName && accountName && accountNumber;
  const hasStripe = stripeAccountId;
  updateData['paymentProfile.paymentReady'] = !!(hasBank || hasStripe);

  const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

  res.status(200).json({
    success: true,
    data: user.paymentProfile
  });
});

export const getPaymentProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('paymentProfile totalEarnings');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      paymentProfile: user.paymentProfile,
      totalEarnings: user.totalEarnings || 0
    }
  });
});

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

export const getEmployerPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ employerId: req.user._id })
    .populate('workerId', 'fullName workerProfile')
    .populate('jobId', 'title')
    .sort({ createdAt: -1 });

  const totalPaid = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);

  res.status(200).json({
    success: true,
    data: payments,
    totalPaid,
    count: payments.length
  });
});

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

export const getWorkerEarningsHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ workerId: req.user._id, status: 'success' })
    .populate('employerId', 'fullName')
    .populate('jobId', 'title salary')
    .sort({ createdAt: -1 });

  const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

  res.status(200).json({
    success: true,
    data: payments,
    totalEarnings,
    count: payments.length
  });
});

export const getJobPaymentStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId).select('isPaid paidAt status salary worker');
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  const payment = await Payment.findOne({ jobId, status: 'success' }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      isPaid: job.isPaid,
      paidAt: job.paidAt,
      payment,
      jobStatus: job.status,
      amount: job.salary
    }
  });
});
