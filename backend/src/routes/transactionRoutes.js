import express from 'express';
import { getWorkerHistory, requestPayout } from '../controllers/transactionController.js';
import { protect, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/worker/history', protect, workerOnly, getWorkerHistory);
router.get('/worker/:id/history', protect, getWorkerHistory);
router.post('/worker/payout', protect, workerOnly, requestPayout);

export default router;