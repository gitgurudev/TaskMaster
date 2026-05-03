import mongoose from 'mongoose';

const msgSchema = new mongoose.Schema({
  taskId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true, trim: true, maxlength: 2000 },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model('TaskMessage', msgSchema);
