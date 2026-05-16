import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
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

    status: {
      type: String,
      enum: ['pending', 'completed', 'success', 'failed'],
      default: 'pending',
    },

    purpose: {
      type: String,
      required: true,
    },

    chapaResponse: {
      type: Object,
    },
    
    paidAt: {
      type: Date,
    }
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ tx_ref: 1 });
transactionSchema.index({ employer: 1 });
transactionSchema.index({ worker: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;