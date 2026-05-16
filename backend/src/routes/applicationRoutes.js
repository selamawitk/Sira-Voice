import express from 'express';
import { 
  getApplicationsForJob,
  getMyApplicationHistory,
  applyToJob, 
  updateApplicationStatus,
  hireWorker // 🆕 Added this for the Contract creation step
} from '../controllers/applicationController.js';
import { protect, workerOnly, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// 📜 Get history (Used by both Workers and Employers)
router.get('/history', protect, getMyApplicationHistory);

// 👥 Get specific applicants for a job post
router.get('/job/:jobId', protect, employerOnly, getApplicationsForJob);

// 📝 Apply for a job
router.post('/:jobId/apply', protect, workerOnly, applyToJob);

// 🔄 Change status (e.g., Shortlisted, Rejected)
router.put('/:id/status', protect, employerOnly, updateApplicationStatus);

// 🤝 Hire Worker (NEW - CRITICAL for Contract creation)
router.post('/:id/hire', protect, employerOnly, hireWorker);

export default router;