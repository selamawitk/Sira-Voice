import express from 'express';
import { 
  getWorkerProfile, 
  updateLiveLocation, 
  toggleAgentMode,
  updateAgentPreferences,
  updateProfile
} from '../controllers/userController.js';
import { protect, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Profile & Location ---
// Get a specific worker's profile (for employers to see)
router.get('/profile/:id', protect, getWorkerProfile);

// Update user profile (e.g., skills from Voice-to-CV)
router.put('/profile', protect, updateProfile);

// Update GPS location (Crucial for your Map matching feature)
router.put('/location', protect, updateLiveLocation);

// --- AI Agent Specifics ---
// Toggle the AI Agent "Active/Inactive" 
router.put('/agent-toggle', protect, workerOnly, toggleAgentMode);

// Change how the AI Agent behaves (e.g., "Only notify me for jobs over 500 ETB")
router.put('/agent-preferences', protect, workerOnly, updateAgentPreferences);

export default router;