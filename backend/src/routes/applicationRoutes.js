import express from 'express';
import { 
  getApplicationsForJob,
  getMyApplicationHistory,
  applyToJob, 
  updateApplicationStatus,
  hireWorker
} from '../controllers/applicationController.js';
import { protect, workerOnly, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/history', protect, getMyApplicationHistory);

router.get('/job/:jobId', protect, employerOnly, getApplicationsForJob);

router.post('/:jobId/apply', protect, workerOnly, applyToJob);

router.put('/:id/status', protect, employerOnly, updateApplicationStatus);

router.post('/:id/hire', protect, employerOnly, hireWorker);

export default router;