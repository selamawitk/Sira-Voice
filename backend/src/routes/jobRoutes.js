import express from 'express';
import { 
  createJob, 
  getJobs, 
  getJobById,
  getJobMatches,
  startJob 
} from '../controllers/jobController.js';
import { protect, employerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Base jobs route: Employers post, everyone can browse
router.route('/')
  .post(protect, employerOnly, createJob)
  .get(getJobs); 

// Dedicated nearby search (if not handled by base GET query)
router.get('/nearby', getJobs); 

// GPS-Verified Job Start (Worker Only)
router.patch('/:id/start', protect, workerOnly, startJob);

// Employer agent: ranked workers for a job
router.get('/:id/matches', protect, employerOnly, getJobMatches);

// Individual Job Details
router.route('/:id')
  .get(getJobById);

export default router;