import express from 'express';
import { 
  getApplicationsForJob,
  getMyApplicationHistory,
  applyToJob, 
  updateApplicationStatus 
} from '../controllers/applicationController.js';
import { protect, workerOnly, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Worker/Employer: list own application/job history
router.get('/history', protect, getMyApplicationHistory);

// Employer: list applications for a specific job
router.get('/job/:jobId', protect, employerOnly, getApplicationsForJob);

router.post('/:jobId/apply', protect, workerOnly, applyToJob);
router.put('/:id/status', protect, employerOnly, updateApplicationStatus);

export default router;