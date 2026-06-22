import Rating from '../models/Rating.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { sendRatingNotification } from '../services/notificationService.js';

export const postRating = asyncHandler(async (req, res) => {
  const { targetUserId, jobId, score, comment, roleAtTime } = req.body;

  const rating = await Rating.create({
    from: req.user._id,
    to: targetUserId,
    job: jobId,
    score,
    comment,
    roleAtTime
  });

  const stats = await Rating.aggregate([
    { $match: { to: new mongoose.Types.ObjectId(targetUserId) } },
    { $group: { _id: '$to', avgRating: { $avg: '$score' }, count: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    const avg = stats[0].avgRating;
    const count = stats[0].count;
    const targetUser = await User.findById(targetUserId);
    const rater = await User.findById(req.user._id);

    if (targetUser) {
      if (targetUser.role === 'worker') {
        targetUser.workerProfile.averageRating = parseFloat(avg.toFixed(1));
        if (avg >= 4.5 && count >= 5) {
          targetUser.isVerified = true;
        }
      } else if (targetUser.role === 'employer') {
        targetUser.employerProfile.employerRating = parseFloat(avg.toFixed(1));
      }
      await targetUser.save();
    }

    try {
      await sendRatingNotification(
        req.io,
        targetUserId,
        rater?.fullName || 'User',
        score
      );
    } catch (error) {
      console.error('Failed to send rating notification:', error);
    }
  }

  res.status(201).json({ success: true, data: rating });
});

export const getUserRatings = asyncHandler(async (req, res) => {
  const ratings = await Rating.find({ to: req.params.userId })
    .populate('from', 'fullName')
    .sort('-createdAt');
  res.json(ratings);
});