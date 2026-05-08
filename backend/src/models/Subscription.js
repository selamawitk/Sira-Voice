import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  planType: { type: String, enum: ['basic', 'pro', 'business'], default: 'basic' },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  features: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);