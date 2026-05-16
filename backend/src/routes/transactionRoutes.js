import express from 'express';
import { getWorkerHistory, requestPayout } from '../controllers/transactionController.js';
import { protect, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All accounting methods here require valid authorization headers and worker-specific roles
router.get('/worker/history', protect, workerOnly, getWorkerHistory);
router.post('/worker/payout', protect, workerOnly, requestPayout);

export default router;