const express = require("express");
const multer = require("multer");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const router = express.Router();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.post("/photo", auth, upload.single("photo"), async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { photo: req.file.filename },
    { new: true }
  );

  res.json({ photo: req.file.filename });
});

module.exports = router;
