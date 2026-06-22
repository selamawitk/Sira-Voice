import express from 'express';
import {
  createContract,
  getEmployerContracts,
  completeContract,
  markContractAsPaid,
  cancelContract
} from '../controllers/contractController.js';

import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, employerOnly, createContract);

router.get(
  '/employer/:employerId',
  protect,
  employerOnly,
  getEmployerContracts
);

router.put(
  '/:id/complete',
  protect,
  employerOnly,
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
  employerOnly,
  cancelContract
);

export default router;