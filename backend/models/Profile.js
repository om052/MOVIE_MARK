const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  bio: String,
  skills: String,
  instagram: String,
  youtube: String,
  photo: String
});

module.exports = mongoose.model("Profile", profileSchema);
