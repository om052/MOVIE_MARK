const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    user: String,
    text: String,
    scene: String,
    likes: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const versionSchema = new mongoose.Schema({
    version: Number,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const scriptSchema = new mongoose.Schema({
    title: String,
    description: String,
    content: String, // For online editor
    file: String, // For uploaded files
    genre: { type: String, enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary'] },
    category: { type: String, enum: ['Short film', 'Web series', 'Feature film', 'Ad / Reel', 'Student film'] },
    visibility: { type: String, enum: ['Public', 'Private', 'Team'], default: 'Public' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    author: String, // From profile
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    versions: [versionSchema],
    currentVersion: { type: Number, default: 1 },
    votes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    chatName: { type: String }, // Custom name for chatroom
    chatEndTime: { type: Date }, // Optional end time for chat
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // All users added to chatroom
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Script", scriptSchema);
