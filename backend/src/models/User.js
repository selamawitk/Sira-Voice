import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Only required if NOT using Google and NOT using Passkeys
      required: function () {
        return !this.googleId && (!this.passkey || !this.passkey.credentialID);
      },
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    currentChallenge: {
      type: String, // Temporary storage for WebAuthn challenge
    },
    passkey: {
      credentialID: { type: String },
      publicKey: { type: String },
      counter: { type: Number, default: 0 },
      transports: [String],
    },
    role: {
      type: String,
      enum: ['worker', 'employer', 'admin'],
      default: 'worker',
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    totalEarnings: { type: Number, default: 0 },
    isAgentActive: { type: Boolean, default: false },

    // Profiles
    workerProfile: {
      title: { type: String, default: '' },
      headline: { type: String, default: '' },
      category: { type: String, default: '' },
      skills: { type: [String], default: [] },
      portfolioLinks: { type: [String], default: [] },
      hourlyRate: { type: Number, default: 0 },
      availability: {
        type: String,
        enum: ['immediate', 'within_week', 'within_month', 'not_available'],
        default: 'immediate',
      },
      bio: { type: String, default: '', maxlength: 1000 },
      experienceYears: { type: Number, default: 0 },
      preferredLanguage: {
        type: String,
        enum: ['amharic', 'oromigna', 'english'],
        default: 'amharic',
      },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      agentPreferences: {
        autoApply: { type: Boolean, default: false },
        maxDistance: { type: Number, default: 10 },
        minSalary: { type: Number, default: 0 },
      },
    },
    employerProfile: {
      companyName: { type: String, default: '' },
      industry: { type: String, default: '' },
      businessAddress: { type: String, default: '' },
      totalJobsPosted: { type: Number, default: 0 },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      region: { type: String, default: '' },
      country: { type: String, default: '' },
      formattedAddress: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ 'workerProfile.skills': 1 });
userSchema.index({ role: 1, isAgentActive: 1 });

// Password Match Method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Password Hashing Middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// JSON Formatting
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.currentChallenge;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);
export default User;