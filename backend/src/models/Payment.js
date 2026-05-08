import mongoose from'mongoose';

const paymentSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionRef: { type: String, unique: true },
  method: { type: String, default: 'telebirr' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);