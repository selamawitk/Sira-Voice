import express from 'express';
import {
  postRating,
  getUserRatings,
  getJobRatingStatus,
  getMyGivenRatings
} from '../controllers/ratingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, postRating);
router.get('/:userId', getUserRatings);
router.get('/job/:jobId/status', protect, getJobRatingStatus);
router.get('/job-given-ratings', protect, getMyGivenRatings);

export default router;
