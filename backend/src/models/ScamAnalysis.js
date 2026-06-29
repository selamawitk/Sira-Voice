import mongoose from 'mongoose';

const scamAnalysisSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    isSafe: {
      type: Boolean,
      default: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
    },
    flags: {
      type: [String],
      default: [],
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

scamAnalysisSchema.index({ jobId: 1 });

export default mongoose.model('ScamAnalysis', scamAnalysisSchema);
