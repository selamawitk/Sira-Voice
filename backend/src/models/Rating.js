import mongoose from "mongoose";

const ratingDimensionSchema = new mongoose.Schema({
  score: { type: Number, required: true, min: 1, max: 5 },
  label: { type: String, required: true }
}, { _id: false });

const ratingSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleAtTime: {
    type: String,
    enum: ['worker', 'employer'],
    required: true
  },
  overall: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  dimensions: [ratingDimensionSchema],
  comment: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

ratingSchema.index({ to: 1, createdAt: -1 });
ratingSchema.index({ job: 1, from: 1 }, { unique: true });

export default mongoose.model('Rating', ratingSchema);
