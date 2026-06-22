import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendSms } from './smsService.js';
import { sendPushNotification } from './pushService.js';

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
        type: data.type || 'SYSTEM',
        metadata: newNotification.metadata,
        isRead: false,
        createdAt: newNotification.createdAt
      });
    }

    sendPushNotification(userId, data.title, data.message, { type: data.type, metadata: newNotification.metadata });

    return newNotification;
  } catch (error) {
    throw error;
  }
};

export const sendJobMatchNotification = async (io, workerId, jobId, jobTitle) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'JOB_MATCH',
    title: 'New Job Match',
    message: `A job matching your skills: "${jobTitle}" is available.`,
    jobId,
    additionalData: { action: 'view_job' }
  });
};

export const sendWorkerRankNotification = async (io, workerId, jobId, jobTitle, rank) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'JOB_MATCH',
    title: 'Top Ranked Match',
    message: `Great news! You have been ranked #${rank} for the job: "${jobTitle}".`,
    jobId,
    additionalData: { action: 'view_job', rank }
  });
};

export const sendHireNotification = async (io, workerId, employerName, jobTitle, contractId) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'HIRE',
    title: "You've been hired",
    message: `${employerName} hired you for "${jobTitle}". Check your contracts.`,
    contractId,
    additionalData: { action: 'view_contract' }
  });
};

export const sendPaymentNotification = async (io, workerId, amount, jobTitle, contractId, options = {}) => {
  const notification = await sendRealTimeNotification(io, workerId, {
    type: 'PAYMENT',
    title: 'Payment Received',
    message: `You received ETB ${amount} for "${jobTitle}".`,
    contractId,
    additionalData: { 
      action: 'view_payment',
      sendSMS: options.sendSMS || false
    }
  });

  if (options.sendSMS) {
    try {
      const worker = await User.findById(workerId).select('phone');
      if (worker && worker.phone) {
        await sendSms({
          to: worker.phone,
          message: `Payment Received: You have been paid ETB ${amount} for "${jobTitle}". Check your Sira Voice dashboard.`
        });
      }
    } catch (smsError) {
      console.error(smsError.message);
    }
  }

  return notification;
};

export const sendRatingNotification = async (io, workerId, raterName, score) => {
  return sendRealTimeNotification(io, workerId, {
    type: 'RATING',
    title: "You've been rated",
    message: `${raterName} gave you ${score} stars.`,
    additionalData: { action: 'view_rating' }
  });
};

export const sendMessageNotification = async (io, userId, senderName, messagePreview, conversationId) => {
  return sendRealTimeNotification(io, userId, {
    type: 'MESSAGE',
    title: `New message from ${senderName}`,
    message: messagePreview,
    additionalData: { action: 'view_message', conversationId }
  });
};

export const sendContractNotification = async (io, userId, title, message, contractId) => {
  return sendRealTimeNotification(io, userId, {
    type: 'CONTRACT',
    title,
    message,
    contractId,
    additionalData: { action: 'view_contract' }
  });
};

export const sendReviewNotification = async (io, userId, reviewerName, jobTitle) => {
  return sendRealTimeNotification(io, userId, {
    type: 'REVIEW',
    title: 'New Review',
    message: `${reviewerName} left a review for "${jobTitle}".`,
    additionalData: { action: 'view_review' }
  });
};

export const sendAIAgentNotification = async (io, userId, title, message, additionalData = {}) => {
  return sendRealTimeNotification(io, userId, {
    type: 'AI_AGENT',
    title,
    message,
    additionalData: { action: 'view_agent', ...additionalData }
  });
};

export const sendScamAlertNotification = async (io, userId, title, message, jobId) => {
  return sendRealTimeNotification(io, userId, {
    type: 'SCAM',
    title,
    message,
    jobId,
    additionalData: { action: 'view_job' }
  });
};

export const sendSystemNotification = async (io, userId, title, message, metadata = {}) => {
  return sendRealTimeNotification(io, userId, {
    type: 'SYSTEM',
    title,
    message,
    ...metadata
  });
};
