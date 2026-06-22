import express from 'express';
import { 
  postRating, 
  getUserRatings 
} from '../controllers/ratingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, postRating);

router.get('/:userId', getUserRatings);

export default router;