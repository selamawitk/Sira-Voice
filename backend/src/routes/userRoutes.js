import express from 'express'
import {
  getWorkerProfile,
  getWorkers,
  updateLiveLocation,
  toggleAgentMode,
  updateAgentPreferences,
  updateProfile
} from '../controllers/userController.js'
import { protect, workerOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/workers', protect, getWorkers)

router.get('/profile/:id', protect, getWorkerProfile)

router.put('/profile', protect, updateProfile)

router.put('/location', protect, updateLiveLocation)

router.put('/agent-toggle', protect, workerOnly, toggleAgentMode)

router.put('/agent-preferences', protect, workerOnly, updateAgentPreferences)

export default router