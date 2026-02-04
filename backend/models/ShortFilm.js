const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    user: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const shortFilmSchema = new mongoose.Schema({
    title: String,
    description: String,
    videoUrl: String,
    thumbnail: String,
    genre: { type: String, enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary'] },
    duration: Number, // in seconds
    creator: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ShortFilm", shortFilmSchema);
