import express from 'express';
import {
  createContract,
  getEmployerContracts,
  completeContract,
  markContractAsPaid, // 💰 Added for the ledger update
  cancelContract      // 🛠️ Added for safety
} from '../controllers/contractController.js';

// Protect ensures the user is logged in
// employerOnly ensures workers can't release their own payments!
import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/contracts
 * @desc    Create a new contract (Triggered when hiring)
 */
router.post('/', protect, employerOnly, createContract);

/**
 * @route   GET /api/contracts/employer/:employerId
 * @desc    Get all contracts for the employer dashboard
 */
router.get(
  '/employer/:employerId',
  protect,
  employerOnly,
  getEmployerContracts
);

/**
 * @route   PUT /api/contracts/:id/complete
 * @desc    Employer marks work as finished (Moves status to 'completed')
 */
router.put(
  '/:id/complete',
  protect,
  employerOnly,
  completeContract
);

/**
 * @route   PUT /api/contracts/:contractId/paid
 * @desc    INTERNAL/WEBHOOK USE: Finalizes the payment status
 * Note: Usually triggered by the Payment Controller logic
 */
router.put(
  '/:contractId/paid',
  protect,
  markContractAsPaid
);

/**
 * @route   DELETE /api/contracts/:id
 * @desc    Cancel a contract before payment is released
 */
router.delete(
  '/:id',
  protect,
  employerOnly,
  cancelContract
);

export default router;