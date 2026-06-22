import express from 'express';
import { 
  createJob, 
  getJobs, 
  getJobById,
  getJobMatches,
  startJob,
  completeJob,
  updateJob,
  deleteJob
} from '../controllers/jobController.js';
import { protect, employerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, employerOnly, createJob)
  .get(getJobs); 

router.get('/nearby', getJobs); 

router.get('/:id/matches', protect, employerOnly, getJobMatches);

router.patch('/:id/start', protect, workerOnly, startJob);

router.patch('/:id/complete', protect, employerOnly, completeJob);

router.route('/:id')
  .get(getJobById)
  .put(protect, employerOnly, updateJob)
  .delete(protect, employerOnly, deleteJob);

export default router;