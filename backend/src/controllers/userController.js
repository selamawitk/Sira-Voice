import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get worker profile by ID
// @route   GET /api/users/workers/:id
// @access  Protected
export const getWorkerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user && user.role === 'worker') {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Worker not found');
  }
});

// @desc    Update worker live GPS location coordinates
// @route   PUT /api/users/location
// @access  Protected/Worker
export const updateLiveLocation = asyncHandler(async (req, res) => {
  const { longitude, latitude, address, city, region, country, formattedAddress } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (longitude === undefined || latitude === undefined) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  user.location = {
    type: 'Point',
    coordinates: [Number(longitude), Number(latitude)],
    address: String(address || user.location?.address || ''),
    city: String(city || user.location?.city || ''),
    region: String(region || user.location?.region || ''),
    country: String(country || user.location?.country || ''),
    formattedAddress: String(formattedAddress || user.location?.formattedAddress || ''),
  };

  await user.save();
  res.json({ message: 'Location updated successfully', location: user.location });
});
// @desc    Toggle general Sira Agent tracking availability state
// @route   PUT /api/users/toggle-agent
// @access  Protected/Worker
export const toggleAgentMode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user && user.role === 'worker') {
    user.isAgentActive = !user.isAgentActive;
    
    // Auto-sync autoApply to keep UI toggle and matching states completely aligned
    if (!user.workerProfile) user.workerProfile = {};
    if (!user.workerProfile.agentPreferences) user.workerProfile.agentPreferences = {};
    user.workerProfile.agentPreferences.autoApply = user.isAgentActive;

    const updatedUser = await user.save();
    res.json({ 
      isAgentActive: updatedUser.isAgentActive,
      autoApply: updatedUser.workerProfile.agentPreferences.autoApply 
    });
  } else {
    res.status(404);
    throw new Error('Worker not found');
  }
});

// @desc    Explicitly update autonomous application values
// @route   PUT /api/users/agent-preferences
// @access  Protected/Worker
export const updateAgentPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user && user.role === 'worker') {
    // Graceful initialization block preventing uncaught property runtime crashes
    if (!user.workerProfile) user.workerProfile = {};
    if (!user.workerProfile.agentPreferences) {
      user.workerProfile.agentPreferences = {
        autoApply: false,
        maxDistance: 15,
        minSalary: 0
      };
    }

    const currentPrefs = user.workerProfile.agentPreferences;

    user.workerProfile.agentPreferences = {
      autoApply: req.body.autoApply ?? currentPrefs.autoApply,
      maxDistance: req.body.maxDistance ?? currentPrefs.maxDistance,
      minSalary: req.body.minSalary ?? currentPrefs.minSalary,
    };

    // Keep top-level agent flag mirrored seamlessly 
    user.isAgentActive = user.workerProfile.agentPreferences.autoApply;

    const updatedUser = await user.save();
    res.json(updatedUser.workerProfile.agentPreferences);
  } else {
    res.status(404);
    throw new Error('Worker profile not found');
  }
});

// @desc    Universal Profile modification handling client form payloads
// @route   PUT /api/users/profile
// @access  Protected
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'worker') {
    if (!user.workerProfile) user.workerProfile = {};
    const profileUpdates = req.body.workerProfile || {};

    // 1. Parse and sanitize headline and category
    if (profileUpdates.title !== undefined) {
      user.workerProfile.title = String(profileUpdates.title).trim();
    }
    if (profileUpdates.headline !== undefined) {
      user.workerProfile.headline = String(profileUpdates.headline).trim();
    }
    if (profileUpdates.category !== undefined) {
      user.workerProfile.category = String(profileUpdates.category).trim();
    }

    // 2. Parse and sanitize worker Bio info
    if (profileUpdates.bio !== undefined) {
      user.workerProfile.bio = String(profileUpdates.bio).trim();
    } else if (req.body.bio !== undefined) {
      user.workerProfile.bio = String(req.body.bio).trim();
    }

    // 3. Process skills matrices ensuring text structures remain intact
    if (profileUpdates.skills !== undefined) {
      user.workerProfile.skills = Array.isArray(profileUpdates.skills)
        ? profileUpdates.skills.map((s) => String(s).trim()).filter(Boolean)
        : String(profileUpdates.skills).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (req.body.skills !== undefined) {
      user.workerProfile.skills = Array.isArray(req.body.skills)
        ? req.body.skills.map((s) => String(s).trim()).filter(Boolean)
        : String(req.body.skills).split(',').map((s) => s.trim()).filter(Boolean);
    }

    // 4. Update portfolio and work availability details
    if (profileUpdates.portfolioLinks !== undefined) {
      user.workerProfile.portfolioLinks = Array.isArray(profileUpdates.portfolioLinks)
        ? profileUpdates.portfolioLinks.map((link) => String(link).trim()).filter(Boolean)
        : String(profileUpdates.portfolioLinks).split(',').map((link) => link.trim()).filter(Boolean);
    }
    if (profileUpdates.hourlyRate !== undefined) {
      const rate = Number(profileUpdates.hourlyRate);
      if (!Number.isNaN(rate) && rate >= 0) {
        user.workerProfile.hourlyRate = rate;
      }
    }
    if (profileUpdates.availability !== undefined) {
      user.workerProfile.availability = String(profileUpdates.availability).trim();
    }

    // 5. Update core Experience timelines
    if (profileUpdates.experienceYears !== undefined) {
      const years = Number(profileUpdates.experienceYears);
      if (!Number.isNaN(years) && years >= 0) {
        user.workerProfile.experienceYears = years;
      }
    }

    // 6. Update user language specifications
    if (profileUpdates.preferredLanguage !== undefined) {
      user.workerProfile.preferredLanguage = String(profileUpdates.preferredLanguage).trim();
    }

    // 7. Deep merge nested preference objects avoiding accidental structural wipes
    if (profileUpdates.agentPreferences !== undefined) {
      user.workerProfile.agentPreferences = {
        ...user.workerProfile.agentPreferences,
        ...profileUpdates.agentPreferences
      };
      
      if (user.workerProfile.agentPreferences.autoApply !== undefined) {
        user.isAgentActive = user.workerProfile.agentPreferences.autoApply;
      }
    }
  }

  if (req.body.location !== undefined) {
    const locationUpdate = req.body.location;
    if (locationUpdate.coordinates && Array.isArray(locationUpdate.coordinates) && locationUpdate.coordinates.length === 2) {
      user.location = {
        type: 'Point',
        coordinates: [Number(locationUpdate.coordinates[0]), Number(locationUpdate.coordinates[1])],
        address: String(locationUpdate.address || user.location?.address || ''),
        city: String(locationUpdate.city || user.location?.city || ''),
        region: String(locationUpdate.region || user.location?.region || ''),
        country: String(locationUpdate.country || user.location?.country || ''),
        formattedAddress: String(locationUpdate.formattedAddress || user.location?.formattedAddress || ''),
      };
    }
  }

  // Handle baseline generic user profile elements
  if (req.body.fullName !== undefined) {
    user.fullName = String(req.body.fullName).trim();
  }

  if (req.body.phone !== undefined) {
    user.phone = String(req.body.phone).trim();
  }

  if (req.body.location !== undefined) {
    user.location = req.body.location;
  }

  const updatedUser = await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser
  });
});