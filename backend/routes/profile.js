const express = require("express");
const router = express.Router();
const Profile = require("../models/Profile");

router.post("/save", async (req, res) => {
  try {
    console.log("Profile save request received at:", new Date().toISOString());
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request headers:", req.headers);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { email, ...updateData } = req.body;
    console.log("Extracted email:", email);
    console.log("Update data keys:", Object.keys(updateData));

    if (!email) {
      console.log("No email provided");
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const profile = await Profile.findOneAndUpdate(
      { email: email },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
    console.log("Profile saved successfully:", profile._id);
    console.log("Profile data:", profile);

    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, message: "Profile saved successfully" });
  } catch (err) {
    console.log("Error saving profile:", err.message);
    console.log("Error stack:", err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, message: "Error saving profile: " + err.message });
  }
});

router.get("/:email", async (req, res) => {
  try {
    const profile = await Profile.findOne({ email: req.params.email });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
