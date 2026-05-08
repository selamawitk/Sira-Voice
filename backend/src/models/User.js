import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String },
  role: { 
    type: String, 
    enum: ['worker', 'employer', 'admin'], 
    default: 'worker' 
  },
  isVerified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  totalEarnings: { type: Number, default: 0 },
  isAgentActive: { type: Boolean, default: false },

  workerProfile: {
    skills: [String],
    bio: String,
    experienceYears: Number,
    rawVoiceTranscript: String,
    voiceUrl: String, 
    preferredLanguage: { 
      type: String, 
      enum: ['amharic', 'oromigna', 'english'], 
      default: 'amharic' 
    },
    averageRating: { type: Number, default: 0 },
    agentPreferences: {
      autoApply: { type: Boolean, default: false },
      maxDistance: { type: Number, default: 10 },
      minSalary: { type: Number, default: 0 }
    }
  },

  employerProfile: {
    companyName: String,
    industry: String, 
    businessAddress: String,
    totalJobsPosted: { type: Number, default: 0 },
    employerRating: { type: Number, default: 0 }
  },

  location: {
    type: { type: String, default: 'Point' },
    coordinates: { 
      type: [Number],
      required: false,
      validate: {
        validator: function(v) {
          if (!v || v.length === 0) return true;
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]'
      }
    }
  }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1 });
userSchema.index({ 'workerProfile.skills': 1 });
userSchema.index({ 'workerProfile.averageRating': -1 });
userSchema.index({ isVerified: 1, role: 1 });

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

const User = mongoose.model('User', userSchema);
export default User;