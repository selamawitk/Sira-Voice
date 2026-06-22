import express from 'express';
import {
  deleteJob,
  getPlatformStats,
  getScamHistory,
  listUsers,
  suspendUser,
  activateUser,
  verifyUser,
  unverifyUser
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, adminOnly, getPlatformStats);
router.get('/scam-history', protect, adminOnly, getScamHistory);

router.get('/users', protect, adminOnly, listUsers);

router.patch('/users/:id/suspend', protect, adminOnly, suspendUser);
router.patch('/users/:id/activate', protect, adminOnly, activateUser);
router.patch('/users/:id/verify', protect, adminOnly, verifyUser);
router.patch('/users/:id/unverify', protect, adminOnly, unverifyUser);

router.delete('/jobs/:id', protect, adminOnly, deleteJob);

export default router;