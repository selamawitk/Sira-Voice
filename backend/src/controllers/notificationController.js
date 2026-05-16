import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .populate({
      path: 'metadata.jobId',
      select: 'title location salary'
    })
    .populate({
      path: 'metadata.contractId',
      select: 'agreedAmount status'
    })
    .populate({
      path: 'metadata.workerId',
      select: 'fullName workerProfile'
    })
    .populate({
      path: 'metadata.employerId',
      select: 'fullName'
    })
    .sort({ createdAt: -1 });

  const unreadCount = await Notification.countDocuments({ 
    userId: req.user._id, 
    isRead: false 
  });

  res.status(200).json({
    success: true,
    data: notifications,
    unreadCount
  });
});

export const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, metadata } = req.body;

  if (!userId || !type || !title || !message) {
    res.status(400);
    throw new Error('Missing required fields: userId, type, title, message');
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata: metadata || {},
    isRead: false
  });

  await notification.populate([
    { path: 'metadata.jobId', select: 'title location salary' },
    { path: 'metadata.contractId', select: 'agreedAmount status' },
    { path: 'metadata.workerId', select: 'fullName' },
    { path: 'metadata.employerId', select: 'fullName' }
  ]);

  res.status(201).json({
    success: true,
    data: notification
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ 
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ 
    success: true,
    message: 'All notifications marked as read' 
  });
});