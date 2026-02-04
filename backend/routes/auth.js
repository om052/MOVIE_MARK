const express = require("express");
const router = express.Router();
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const bcrypt = require("bcryptjs");

/* =======================
   ENSURE UPLOADS FOLDER
======================= */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* =======================
   AUTH MIDDLEWARE
======================= */
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* =======================
   UPLOAD PHOTO (ONLY PHOTO)
======================= */
router.post("/upload-photo", auth, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: req.file.filename },
      { new: true }
    );

    res.json({
      msg: "Photo uploaded",
      photo: user.photo
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* =======================
   REGISTER (FIXED - HASH PASSWORD)
======================= */
router.post("/register", async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ ...userData, password: hashedPassword });
    res.json({ msg: "Registered" });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

/* =======================
   LOGIN (FIXED - USE BCRYPT)
======================= */
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      roles: user.roles
    };

    res.json({ token, user: userResponse });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* =======================
   GET LOGGED USER
======================= */
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* =======================
   UPDATE PROFILE (FIXED)
   ❌ removed multer here
======================= */
router.put("/update", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
module.exports.auth = auth;