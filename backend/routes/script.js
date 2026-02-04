const express = require("express");
const Script = require("../models/Script");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Ensure uploads folder
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

// Auth middleware
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

// Multer config for script uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Upload script file
router.post("/upload", auth, upload.single("file"), async (req, res) => {
    try {
        const { title, description, genre, category, visibility } = req.body;
        const user = await User.findById(req.user.id);
        const profile = await require("../models/Profile").findOne({ email: user.email });

        const script = new Script({
            title,
            description,
            file: req.file ? req.file.filename : null,
            genre,
            category,
            visibility,
            status: 'pending',
            author: profile ? profile.name : user.name,
            uploadedBy: req.user.id,
            versions: [{ version: 1, content: "" }]
        });
        await script.save();
        res.json({ msg: "Script uploaded", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Create script with content (online editor)
router.post("/create", auth, async (req, res) => {
    try {
        const { title, description, content, genre, category, visibility } = req.body;
        const user = await User.findById(req.user.id);
        const profile = await require("../models/Profile").findOne({ email: user.email });

        const script = new Script({
            title,
            description,
            content,
            genre,
            category,
            visibility,
            author: profile ? profile.name : user.name,
            uploadedBy: req.user.id,
            versions: [{ version: 1, content }]
        });
        await script.save();
        res.json({ msg: "Script created", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Update script content (save version)
router.put("/:id", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id && !script.collaborators.includes(req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const newVersion = script.currentVersion + 1;
        script.versions.push({ version: newVersion, content: req.body.content });
        script.content = req.body.content;
        script.currentVersion = newVersion;
        script.updatedAt = new Date();
        await script.save();

        res.json({ msg: "Script updated", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get public scripts for homepage
router.get("/public", async (req, res) => {
    try {
        const scripts = await Script.find({ visibility: 'Public' })
            .populate('uploadedBy', 'name')
            .sort({ votes: -1, updatedAt: -1 })
            .limit(8); // Limit to 8 for showcase
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get homepage stats
router.get("/stats", async (req, res) => {
    try {
        const totalScripts = await Script.countDocuments({ visibility: 'Public' });
        const totalUsers = await User.countDocuments();
        const totalFilms = await require("../models/ShortFilm").countDocuments() || 0; // Assuming ShortFilm model exists
        res.json({
            scripts: totalScripts,
            users: totalUsers,
            films: totalFilms
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get all scripts (public or user's)
router.get("/", auth, async (req, res) => {
    try {
        const scripts = await Script.find({
            $or: [
                { visibility: 'Public' },
                { uploadedBy: req.user.id },
                { collaborators: req.user.id }
            ]
        }).populate('uploadedBy', 'name').sort({ updatedAt: -1 });
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get script by ID
router.get("/:id", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id).populate('uploadedBy', 'name').populate('collaborators', 'name');
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.visibility === 'Private' && script.uploadedBy._id.toString() !== req.user.id && !script.collaborators.some(c => c._id.toString() === req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        res.json(script);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add collaborator
router.post("/:id/collaborate", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Only owner can add collaborators" });
        }

        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ msg: "User not found" });

        if (!script.collaborators.includes(user._id)) {
            script.collaborators.push(user._id);
            await script.save();
        }

        res.json({ msg: "Collaborator added" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        const user = await User.findById(req.user.id);
        script.comments.push({
            user: user.name,
            text: req.body.text,
            scene: req.body.scene
        });
        await script.save();

        res.json({ msg: "Comment added" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get comments
router.get("/:id/comments", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        res.json(script.comments);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Restore version
router.post("/:id/restore/:version", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Only owner can restore versions" });
        }

        const versionData = script.versions.find(v => v.version == req.params.version);
        if (!versionData) return res.status(404).json({ msg: "Version not found" });

        script.content = versionData.content;
        script.updatedAt = new Date();
        await script.save();

        res.json({ msg: "Version restored" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
