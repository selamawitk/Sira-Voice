import express from 'express';
import { subscribe, getMySubscription } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/upgrade', protect, subscribe);
router.get('/status', protect, getMySubscription);

export default router;