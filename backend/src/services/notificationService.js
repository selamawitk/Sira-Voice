import Notification from '../models/Notification.js';

/**
 * Send real-time notification and save to database
 */
export const sendRealTimeNotification = async (io, userId, data) => {
  try {
    const notificationData = {
      userId,
      type: data.type || 'SYSTEM',
      title: data.title,
      message: data.message,
      metadata: {
        jobId: data.jobId || null,
        contractId: data.contractId || null,
        workerId: data.workerId || null,
        employerId: data.employerId || null,
        paymentId: data.paymentId || null,
        additionalData: data.additionalData || {}
      },
      isRead: false
    };

    const newNotification = await Notification.create(notificationData);

    if (io && userId) {
      io.to(userId.toString()).emit('notification', {
        _id: newNotification._id,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: newNotification.metadata,
        isRead: false,
        createdAt: newNotification.createdAt
      });
    }

    console.log(`🔔 Notification sent to user: ${userId}`);
    return newNotification;
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
    throw error;
  }
};

/**
 * Send JOB_MATCH notification to worker
 */
export const sendJobMatchNotification = async (io, workerId, jobId, jobTitle) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'JOB_MATCH',
    title: 'New Job Match! 🎯',
    message: `A job matching your skills: "${jobTitle}" is available.`,
    jobId,
    additionalData: { action: 'view_job' }
  });
};

/**
 * Send HIRE notification to worker
 */
export const sendHireNotification = async (io, workerId, employerName, jobTitle, contractId) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'HIRE',
    title: 'You\'ve been hired! 🎉',
    message: `${employerName} hired you for "${jobTitle}". Check your contracts.`,
    contractId,
    additionalData: { action: 'view_contract' }
  });
};

/**
 * Send PAYMENT notification to worker
 */
export const sendPaymentNotification = async (io, workerId, amount, jobTitle, paymentId) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'PAYMENT',
    title: 'Payment Received! 💰',
    message: `You received ETB ${amount} for "${jobTitle}".`,
    paymentId,
    additionalData: { action: 'view_payment' }
  });
};

/**
 * Send RATING notification to worker
 */
export const sendRatingNotification = async (io, workerId, raterName, score) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'RATING',
    title: 'You\'ve been rated! ⭐',
    message: `${raterName} gave you ${score} stars.`,
    additionalData: { action: 'view_rating' }
  });
};

/**
 * Send system notification to user
 */
export const sendSystemNotification = async (io, userId, title, message, metadata = {}) => {
  return sendRealTimeNotification(io, userId, {
    type: 'SYSTEM',
    title,
    message,
    ...metadata
  });
};