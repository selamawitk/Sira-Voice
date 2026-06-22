import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios';
import { sendSystemNotification } from '../services/notificationService.js';

export const getWorkerHistory = asyncHandler(async (req, res) => {
  const targetWorkerId = req.params.id || req.user._id;

  const history = await Transaction.find({ worker: targetWorkerId })
    .populate('employer', 'fullName')
    .populate('job', 'title category')
    .sort({ createdAt: -1 });

  let walletBalance = 0;
  if (req.params.id) {
    const targetUser = await User.findById(req.params.id);
    walletBalance = targetUser?.workerProfile?.balance || 0;
  } else {
    walletBalance = req.user.workerProfile?.balance || 0;
  }

  const formattedHistory = history.map((tx) => {
    let titleContext = tx.job?.title || 'System Transaction';
    if (tx.purpose === 'worker_payout_withdrawal') {
      titleContext = 'Wallet Payout Withdrawal';
    }

    return {
      _id: tx._id,
      title: titleContext,
      employer: tx.employer?.fullName || 'Sira Platform Partner',
      payout: tx.amount,
      status: tx.status,
      date: tx.paidAt ? new Date(tx.paidAt).toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString(),
    };
  });

  res.json({
    success: true,
    balance: walletBalance,
    count: formattedHistory.length,
    data: formattedHistory
  });
});

export const requestPayout = asyncHandler(async (req, res) => {
  const { amount, account_name, account_number, bank_code } = req.body;
  const workerId = req.user._id;

  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    res.status(400);
    throw new Error('Please provide a valid payout request amount');
  }

  const user = await User.findById(workerId);
  const currentBalance = user.workerProfile?.balance || 0;

  if (currentBalance < numericAmount) {
    res.status(400);
    throw new Error(`Insufficient funds. Available balance: ${currentBalance} ETB.`);
  }

  const tx_ref = `PAYOUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  user.workerProfile.balance -= numericAmount;
  await user.save();

  try {
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transfers',
      {
        account_name,
        account_number,
        amount: numericAmount,
        currency: 'ETB',
        reference: tx_ref,
        bank_code
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const transaction = await Transaction.create({
      employer: workerId,
      worker: workerId,
      amount: numericAmount,
      currency: 'ETB',
      tx_ref,
      status: 'success', 
      purpose: 'worker_payout_withdrawal',
      chapaResponse: chapaResponse.data,
      paidAt: new Date()
    });

    sendSystemNotification(req.io, workerId, 'Payout Successful', `ETB ${numericAmount} has been transferred to your bank account.`);

    res.status(200).json({
      success: true,
      message: 'Payout processed and transferred successfully!',
      data: transaction,
      remainingBalance: user.workerProfile.balance
    });

  } catch (error) {
    user.workerProfile.balance += numericAmount;
    await user.save();

    await Transaction.create({
      employer: workerId,
      worker: workerId,
      amount: numericAmount,
      currency: 'ETB',
      tx_ref,
      status: 'failed',
      purpose: 'worker_payout_withdrawal',
      chapaResponse: error.response?.data || { message: error.message }
    });

    sendSystemNotification(req.io, workerId, 'Payout Failed', `Your payout of ETB ${numericAmount} failed. The amount has been returned to your wallet.`);

    res.status(500);
    throw new Error(`Chapa Transfer Failed: ${error.response?.data?.message || error.message}`);
  }
});