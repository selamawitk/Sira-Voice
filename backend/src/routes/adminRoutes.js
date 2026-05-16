import express from 'express';
import { deleteJob, getPlatformStats } from '../controllers/adminController.js';
import { getScamHistory } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// The "adminOnly" middleware you just shared is used here
router.get('/stats', protect, adminOnly, getPlatformStats);
router.get('/scam-history', protect, adminOnly, getScamHistory);

// Moderate/remove fake jobs
router.delete('/jobs/:id', protect, adminOnly, deleteJob);

export default router;