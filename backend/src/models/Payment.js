import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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

    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'ETB',
    },

    tx_ref: {
      type: String,
      required: true,
      unique: true,
    },

    chapa_transaction_id: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
    },

    purpose: {
      type: String,
      enum: ['job_payment', 'escrow_release', 'subscription', 'verification'],
      default: 'job_payment',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    gatewayResponse: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ tx_ref: 1 });
paymentSchema.index({ contractId: 1 });
paymentSchema.index({ employerId: 1 });
paymentSchema.index({ workerId: 1 });

export default mongoose.model('Payment', paymentSchema);