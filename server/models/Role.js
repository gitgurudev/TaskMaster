import mongoose from 'mongoose';

const permSchema = new mongoose.Schema({
  key:    { type: String, required: true },
  view:   { type: String, enum: ['all', 'own', 'none'], default: 'none' },
  create: { type: Boolean, default: false },
  edit:   { type: String, enum: ['all', 'own', 'none'], default: 'none' },
  delete: { type: String, enum: ['all', 'own', 'none'], default: 'none' },
}, { _id: false });

const roleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 100 },
  permissions: [permSchema],
  isSystem:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
