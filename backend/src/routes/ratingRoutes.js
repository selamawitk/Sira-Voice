import express from 'express';
import {
  postRating,
  getUserRatings,
  getJobRatingStatus
} from '../controllers/ratingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, postRating);
router.get('/:userId', getUserRatings);
router.get('/job/:jobId/status', protect, getJobRatingStatus);

export default router;
