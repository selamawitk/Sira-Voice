import express from 'express';
import { 
  postRating, 
  getUserRatings 
} from '../controllers/ratingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Matches the controller export 'postRating'
router.post('/', protect, postRating);

router.get('/:userId', getUserRatings);

export default router;