import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios'; // Ensure axios is installed for API requests

// @desc    Get worker payment and payout withdrawal history
// @route   GET /api/transactions/worker/history
// @access  Protected/Worker
export const getWorkerHistory = asyncHandler(async (req, res) => {
  const history = await Transaction.find({ worker: req.user._id })
    .populate('employer', 'fullName')
    .populate('job', 'title category')
    .sort({ createdAt: -1 });

  const walletBalance = req.user.workerProfile?.balance || 0;

  res.json({
    success: true,
    balance: walletBalance,
    count: history.length,
    data: history
  });
});

// @desc    Worker requests an automated withdrawal via Chapa Transfers API
// @route   POST /api/transactions/worker/payout
// @access  Protected/Worker
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

  // 1. Deduct balance immediately to prevent double-withdrawal attacks
  user.workerProfile.balance -= numericAmount;
  await user.save();

  try {
    // 2. Initiate Chapa Transfer Request
    // Bank codes can be found in Chapa's documentation (e.g., CBE, Telebirr, Awash)
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

    // 3. Create a successful audit ledger if Chapa accepts the request
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

    res.status(200).json({
      success: true,
      message: 'Payout processed and transferred successfully!',
      data: transaction,
      remainingBalance: user.workerProfile.balance
    });

  } catch (error) {
    // 4. Rollback safety net: If Chapa rejects the API call, refund the worker's app wallet balance
    user.workerProfile.balance += numericAmount;
    await user.save();

    // Log the failed transaction attempt for troubleshooting records
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

    res.status(500);
    throw new Error(`Chapa Transfer Failed: ${error.response?.data?.message || error.message}`);
  }
});