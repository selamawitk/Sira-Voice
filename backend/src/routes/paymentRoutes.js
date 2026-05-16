import express from 'express';
import {
  initializeChapa,
  verifyChapaWebhook,
  getUserTransactions,
  payContract,
  getEmployerPayments,
  getWorkerPayments
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/initialize', protect, initializeChapa);
router.post('/contract', protect, payContract);
router.post('/webhook', verifyChapaWebhook);
router.get('/history', protect, getUserTransactions);
router.get('/employer/:id', protect, getEmployerPayments);
router.get('/worker/:id', protect, getWorkerPayments);

export default router;