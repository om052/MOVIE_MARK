const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  roles: [String],
  isAdmin: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },

  bio: String,
  roleInFilm: String,
  skills: String,
  instagram: String,
  youtube: String,
  photo: String
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
