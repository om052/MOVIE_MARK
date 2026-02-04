const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'file'], default: 'text' },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  edited: { type: Boolean, default: false },
  reported: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
