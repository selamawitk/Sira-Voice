import Rating from '../models/Rating.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { sendRatingNotification } from '../services/notificationService.js';

export const postRating = asyncHandler(async (req, res) => {
  const { targetUserId, jobId, overall, dimensions, comment, roleAtTime } = req.body;

  const existingRating = await Rating.findOne({ job: jobId, from: req.user._id });
  if (existingRating) {
    return res.status(400).json({
      success: false,
      message: 'You have already rated this job'
    });
  }

  const rating = await Rating.create({
    from: req.user._id,
    to: targetUserId,
    job: jobId,
    overall: overall || 5,
    dimensions: dimensions || [],
    comment: comment || '',
    roleAtTime: roleAtTime || req.user.role
  });

  const stats = await Rating.aggregate([
    { $match: { to: new mongoose.Types.ObjectId(targetUserId) } },
    { $group: { _id: '$to', avgRating: { $avg: '$overall' }, count: { $sum: 1 } } }
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
        overall || 5
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
  res.json({ success: true, data: ratings });
});

export const getJobRatingStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const myRating = await Rating.findOne({ job: jobId, from: req.user._id });
  res.json({ success: true, hasRated: !!myRating, rating: myRating });
});
