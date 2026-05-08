import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getWorkerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user && user.role === 'worker') {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Worker not found');
  }
});

export const updateLiveLocation = asyncHandler(async (req, res) => {
  const { longitude, latitude } = req.body;
  const user = await User.findById(req.user._id);

  if (user) {
    user.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    await user.save();
    res.json({ message: 'Location updated' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export const toggleAgentMode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user && user.role === 'worker') {
    user.isAgentActive = !user.isAgentActive;
    const updatedUser = await user.save();
    res.json({ isAgentActive: updatedUser.isAgentActive });
  } else {
    res.status(404);
    throw new Error('Worker not found');
  }
});

export const updateAgentPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user && user.role === 'worker') {
    user.workerProfile.agentPreferences = {
      autoApply: req.body.autoApply ?? user.workerProfile.agentPreferences.autoApply,
      maxDistance: req.body.maxDistance ?? user.workerProfile.agentPreferences.maxDistance,
      minSalary: req.body.minSalary ?? user.workerProfile.agentPreferences.minSalary,
    };

    const updatedUser = await user.save();
    res.json(updatedUser.workerProfile.agentPreferences);
  } else {
    res.status(404);
    throw new Error('Worker profile not found');
  }
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    if (req.body.skills && user.role === 'worker') {
      user.workerProfile.skills = req.body.skills;
    }
    // Add other profile updates as needed

    const updatedUser = await user.save();
    res.json({
      message: 'Profile updated successfully',
      workerProfile: updatedUser.workerProfile
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});