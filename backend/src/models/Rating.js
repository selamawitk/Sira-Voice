import mongoose from "mongoose";

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
  score: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: {
    type: String,
    trim: true
  },
  roleAtTime: { 
    type: String, 
    enum: ['worker', 'employer'],
    required: true
  }
}, { 
  timestamps: true 
});

ratingSchema.index({ to: 1, createdAt: -1 });

export default mongoose.model('Rating', ratingSchema);