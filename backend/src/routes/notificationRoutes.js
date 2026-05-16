import express from 'express';
import { 
  getMyNotifications,
  createNotification,
  markAsRead, 
  markAllAsRead 
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.post('/', protect, createNotification);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);

export default router;