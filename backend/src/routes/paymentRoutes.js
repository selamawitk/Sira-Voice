import express from 'express';
import {
  initializeChapa,
  verifyChapaWebhook,
  verifyChapaTransaction,
  getUserTransactions,
  payContract,
  getEmployerPayments,
  getWorkerPayments,
  initiateJobPayment,
  updatePaymentProfile,
  getPaymentProfile,
  getEmployerPaymentHistory,
  getWorkerEarningsHistory,
  getJobPaymentStatus
} from '../controllers/paymentController.js';
import { protect, employerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/initialize', protect, initializeChapa);
router.post('/contract', protect, payContract);
router.post('/initiate-job-payment', protect, employerOnly, initiateJobPayment);
router.post('/verify-transaction', protect, verifyChapaTransaction);
router.post('/webhook', verifyChapaWebhook);
router.get('/history', protect, getUserTransactions);
router.get('/employer/:id', protect, employerOnly, getEmployerPayments);
router.get('/worker/:id', protect, getWorkerPayments);
router.put('/profile', protect, updatePaymentProfile);
router.get('/profile', protect, getPaymentProfile);
router.get('/employer-history', protect, employerOnly, getEmployerPaymentHistory);
router.get('/worker-earnings', protect, workerOnly, getWorkerEarningsHistory);
router.get('/job-status/:jobId', protect, getJobPaymentStatus);

export default router;
