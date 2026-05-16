import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },

    paymentType: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'fixed', 'contract'],
      default: 'fixed',
    },

    agreedAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'paid', 'cancelled'],
      default: 'active',
    },

    escrowStatus: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded'],
      default: 'pending',
    },

    paymentReference: {
      type: String,
      unique: true,
      sparse: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: Date,
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Contract', contractSchema);