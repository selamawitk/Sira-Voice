import express from 'express';
import { deleteJob, getPlatformStats } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// The "adminOnly" middleware you just shared is used here
router.get('/stats', protect, adminOnly, getPlatformStats);

// Moderate/remove fake jobs
router.delete('/jobs/:id', protect, adminOnly, deleteJob);

export default router;