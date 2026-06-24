import express from 'express';
import {
  createContract,
  getEmployerContracts,
  getWorkerContracts,
  completeContract,
  markContractAsPaid,
  cancelContract
} from '../controllers/contractController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createContract);

router.get(
  '/employer/:employerId',
  protect,
  getEmployerContracts
);

router.get(
  '/worker/:workerId',
  protect,
  getWorkerContracts
);

router.put(
  '/:id/complete',
  protect,
  completeContract
);

router.put(
  '/:contractId/paid',
  protect,
  markContractAsPaid
);

router.delete(
  '/:id',
  protect,
  cancelContract
);

export default router;
