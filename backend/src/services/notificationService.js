import Notification from '../models/Notification.js';

export const sendRealTimeNotification = async (io, userId, data) => {
  try {
    const newNotification = await Notification.create({
      user: userId,
      title: data.title,
      message: data.message,
      job: data.jobId || null,
      type: data.type || 'system'
    });

    if (io) {
      io.to(userId.toString()).emit('notification', {
        _id: newNotification._id,
        title: data.title,
        message: data.message,
        jobId: data.jobId,
        type: data.type,
        isRead: false,
        createdAt: newNotification.createdAt
      });
    }

    console.log(`🔔 Notification sent and saved for user: ${userId}`);
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
  }
};