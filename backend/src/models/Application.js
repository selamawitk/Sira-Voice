import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Tracks if the AI Agent automatically suggested this worker
  appliedByAI: {
    type: Boolean,
    default: false
  },
  // The Gemini-calculated compatibility (0-100)
  matchScore: {
    type: Number,
    default: 0
  },
  // Tracks the Chapa transaction status for this specific hire
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'refunded'],
    default: 'unpaid'
  },
  note: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

applicationSchema.index({ worker: 1, job: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

export default Application;