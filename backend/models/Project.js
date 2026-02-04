const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary', 'Action', 'Sci-Fi'],
    required: true
  },
  category: {
    type: String,
    enum: ['Short film', 'Web series', 'Feature film', 'Ad / Reel', 'Student film'],
    required: true
  },
  status: {
    type: String,
    enum: ['Planning', 'Pre-production', 'Production', 'Post-production', 'Completed', 'Cancelled'],
    default: 'Planning'
  },
  budget: {
    type: Number,
    min: 0
  },
  deadline: {
    type: Date
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['Director', 'Writer', 'Producer', 'Actor', 'Cinematographer', 'Editor', 'Sound Designer', 'Other']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  scripts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script'
  }],
  shortFilms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShortFilm'
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tags: [String],
  visibility: {
    type: String,
    enum: ['Public', 'Private', 'Team'],
    default: 'Team'
  },
  featured: {
    type: Boolean,
    default: false
  },
  locked: {
    type: Boolean,
    default: false
  },
  paused: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ collaborators: 1 });
projectSchema.index({ genre: 1, category: 1 });
projectSchema.index({ featured: 1, visibility: 1 });

module.exports = mongoose.model("Project", projectSchema);
