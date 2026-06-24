import express from 'express';
import { 
  getApplicationsForJob,
  getMyApplicationHistory,
  getWorkerHistory,
  applyToJob, 
  updateApplicationStatus,
  hireWorker,
  workerMarkFinished
} from '../controllers/applicationController.js';
import { protect, workerOnly, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/history', protect, getMyApplicationHistory);

router.get('/worker-history', protect, workerOnly, getWorkerHistory);

router.get('/job/:jobId', protect, employerOnly, getApplicationsForJob);

router.post('/:jobId/apply', protect, workerOnly, applyToJob);

router.put('/:id/status', protect, employerOnly, updateApplicationStatus);

router.post('/:id/hire', protect, employerOnly, hireWorker);

router.put('/:contractId/mark-finished', protect, workerOnly, workerMarkFinished);

export default router;
