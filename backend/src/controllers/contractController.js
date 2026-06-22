import Contract from '../models/Contract.js';
import Job from '../models/Job.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSystemNotification, sendContractNotification } from '../services/notificationService.js';

/**
 * ✅ CREATE CONTRACT
 * Triggered when an employer hires a worker.
 * Status defaults to 'active', escrowStatus defaults to 'pending'.
 */
export const createContract = asyncHandler(async (req, res) => {
  const {
    employerId,
    workerId,
    jobId,
    paymentType = 'daily',
    agriedAmount
  } = req.body;

  if (!employerId || !workerId || !jobId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required contract fields'
    });
  }

  const job = await Job.findById(jobId).populate('employer', 'fullName');
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job context not found'
    });
  }

  const contract = await Contract.create({
    employerId,
    workerId,
    jobId,
    paymentType,
    agreedAmount: agriedAmount || job.salary,
    status: 'active',
    escrowStatus: 'pending', // Waiting for employer to initiate payment
    startedAt: new Date()
  });

  // Send system notification to worker about contract creation
  try {
    await sendSystemNotification(
      req.io,
      workerId,
      '📋 New Contract Created',
      `Your contract for "${job.title}" has been created. You can now start working.`,
      {
        contractId: contract._id,
        jobId: job._id
      }
    );
  } catch (error) {
    console.error('Failed to send contract notification:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Contract initiated successfully',
    data: contract
  });
});

/**
 * ✅ GET EMPLOYER CONTRACTS
 * Optimized for the ActiveContracts UI with population
 */
export const getEmployerContracts = asyncHandler(async (req, res) => {
  const { employerId } = req.params;

  const contracts = await Contract.find({ employerId })
    .populate('workerId', 'fullName phone rating isVerified avatar')
    .populate('jobId', 'title salary location status')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: contracts.length,
    data: contracts
  });
});

/**
 * ✅ COMPLETE CONTRACT (WORKER FINISHED)
 * Marks the work as done, but doesn't release funds yet.
 */
export const completeContract = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contract = await Contract.findById(id);

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  contract.status = 'completed';
  contract.completedAt = new Date();

  await contract.save();

  const job = await Job.findById(contract.jobId).select('title employer');
  if (job) {
    sendContractNotification(req.io, job.employer, 'Work Completed', `Worker marked "${job.title}" as completed. Review and release payment.`, contract._id);
  }

  res.json({
    success: true,
    message: 'Work marked as completed. Funds ready for release.',
    data: contract
  });
});

/**
 * 💰 MARK CONTRACT AS PAID (CHAPA WEBHOOK ONLY)
 * This is the ONLY function that should finalize the money.
 * It is called by your Payment Controller after verifying the Chapa Hash.
 */
export const markContractAsPaid = asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { tx_ref } = req.body; // Passed from the payment verification logic

  const contract = await Contract.findById(contractId);

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  contract.status = 'paid';
  contract.escrowStatus = 'released'; 
  contract.paymentReference = tx_ref;
  contract.paidAt = new Date();

  await contract.save();

  const job = await Job.findById(contract.jobId).select('title');
  await Job.findByIdAndUpdate(contract.jobId, { status: 'closed' });

  if (job) {
    sendContractNotification(req.io, contract.workerId, 'Payment Released', `Payment for "${job.title}" has been released to your wallet.`, contract._id);
  }

  res.json({
    success: true,
    message: 'Ledger updated: Contract paid.',
    data: contract
  });
});

/**
 * 🛠 CANCEL CONTRACT
 * Safety net if the hire was a mistake or worker didn't show up.
 */
export const cancelContract = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contract = await Contract.findById(id);

  if (!contract) return res.status(404).json({ success: false, message: 'Not found' });
  
  if (contract.escrowStatus === 'released') {
    return res.status(400).json({ success: false, message: 'Cannot cancel a paid contract' });
  }

  contract.status = 'cancelled';
  await contract.save();

  const jobCancelled = await Job.findById(contract.jobId).select('title');
  if (jobCancelled) {
    sendContractNotification(req.io, contract.workerId, 'Contract Cancelled', `Contract for "${jobCancelled.title}" has been cancelled.`, contract._id);
  }

  res.json({ success: true, message: 'Contract cancelled' });
});