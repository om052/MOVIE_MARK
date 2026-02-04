const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  releaseDate: Date,
  genre: {
    type: String,
    enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary', 'Action', 'Sci-Fi'],
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'released', 'in-production'],
    default: 'upcoming'
  },
  poster: String, // URL to movie poster
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Movie", movieSchema);
