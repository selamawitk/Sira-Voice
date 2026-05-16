import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number,
      default: 0,
    },
    skillHits: {
      type: Number,
      default: 0,
    },
    isAutoMatch: {
      type: Boolean,
      default: false,
    },
    summary: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

matchSchema.index({ job: 1, worker: 1 }, { unique: true });

const Match = mongoose.model('Match', matchSchema);

export default Match;
