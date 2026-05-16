import express from 'express';
import { 
  createJob, 
  getJobs, 
  getJobById,
  getJobMatches,
  startJob 
} from '../controllers/jobController.js';
// Make sure to import your recommended jobs controller function once created
// import { getRecommendedJobs } from '../controllers/userController.js'; 
import { protect, employerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
//   GLOBAL JOB OPERATIONS
// ==========================================

// Base jobs route: Employers post, everyone can browse with queries
router.route('/')
  .post(protect, employerOnly, createJob)
  .get(getJobs); 

// Dedicated nearby search geo-queries
router.get('/nearby', getJobs); 


// ==========================================
//   AI SIRA AGENT & MATCHING ROUTES
// ==========================================

// 1. Employer Agent: Fetch ranked workers recommended for a specific job post
router.get('/:id/matches', protect, employerOnly, getJobMatches);

// 2. Worker Agent: Fetch ranked job recommendations personalized for the logged-in worker
// NOTE: Wire this up to your user/worker controller recommendation function when ready!
// router.get('/recommendations', protect, workerOnly, getRecommendedJobs);


// ==========================================
//   SPECIFIC JOB LIFECYCLE
// ==========================================

// GPS-Verified Job Start (Worker Only via active location check)
router.patch('/:id/start', protect, workerOnly, startJob);

// Individual Job Details Profile Card
router.route('/:id')
  .get(getJobById);

export default router;