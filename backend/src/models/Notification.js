import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: { 
    type: String, 
    enum: [
      'JOB_MATCH',
      'HIRE',
      'PAYMENT',
      'RATING',
      'MESSAGE',
      'CONTRACT',
      'REVIEW',
      'AI_AGENT',
      'SCAM',
      'FRAUD',
      'APPLICATION',
      'JOB_COMPLETE',
      'JOB_CLOSED',
      'SYSTEM',
    ],
    default: 'SYSTEM'
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  metadata: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    additionalData: {
      type: Object
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;