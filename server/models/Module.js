import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
}, { timestamps: false });

export default mongoose.model('Module', moduleSchema);
