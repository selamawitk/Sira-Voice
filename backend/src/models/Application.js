import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['VOICE', 'FORM', 'AI'],
      default: 'FORM',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    appliedByAI: {
      type: Boolean,
      default: false,
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    includeCv: {
      type: Boolean,
      default: false,
    },
    cvId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV',
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'refunded'],
      default: 'unpaid',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    workerSnapshot: {
      fullName: String,
      profileImage: String,
      skills: [String],
      bio: String,
      experienceYears: Number,
      hourlyRate: Number,
      location: {
        city: String,
        region: String,
        country: String,
      },
      averageRating: Number,
      totalRatings: Number,
      completedJobs: Number,
      availability: String,
      cv: String,
      cvSkills: [String],
      cvExperience: Number,
      cvLocation: String,
      cvBio: String,
    },
    employerSnapshot: {
      fullName: String,
      companyName: String,
      profileImage: String,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ worker: 1, job: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);