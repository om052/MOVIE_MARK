const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
