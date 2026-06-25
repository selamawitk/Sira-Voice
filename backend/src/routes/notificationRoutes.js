import express from 'express';
import { 
  getMyNotifications,
  createNotification,
  markAsRead, 
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.post('/', protect, createNotification);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

export default router;