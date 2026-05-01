import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
}, { timestamps: true });

export default mongoose.model('Department', departmentSchema);
