import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['password_reset', 'voice_auth'], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

otpSchema.index({ phone: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OTP', otpSchema);