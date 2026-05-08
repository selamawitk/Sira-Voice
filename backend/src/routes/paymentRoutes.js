import express from 'express';
import { 
  initializeChapa, 
  verifyChapaWebhook,
  getUserTransactions 
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/initialize', protect, initializeChapa);

router.post('/webhook', verifyChapaWebhook);

router.get('/history', protect, getUserTransactions);

export default router;