import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a job title'],
      trim: true,
    },

    category: {
      type: String,
      required: [true, 'Category is required for AI matching'],
      index: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      locationName: {
        type: String,
        trim: true,
        default: '',
      },

      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    salary: {
      type: Number,
      required: [true, 'Please add a salary amount'],
      index: true,
    },

    paymentType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'fixed'],
      default: 'daily',
    },

    escrowEnabled: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ['open', 'hired', 'in-progress', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },

    voiceMemoUrl: {
      type: String,
      default: null,
    },

    isAiFlagged: {
      type: Boolean,
      default: false,
    },

    aiRiskScore: {
      type: Number,
      default: 0, // 0 = safe, 100 = risky
    },

    aiAnalysis: {
      type: Object,
      default: null,
    },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
  },

  {
    timestamps: true,
  }
);

jobSchema.index({ location: '2dsphere' });

jobSchema.index({ category: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ salary: 1 });
jobSchema.index({ employer: 1, status: 1 });

export default mongoose.model('Job', jobSchema);