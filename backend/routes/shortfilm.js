const express = require("express");
const router = express.Router();
const ShortFilm = require("../models/ShortFilm");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

// Multer configuration for video uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/') || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only video files and images are allowed'));
        }
    }
});

// Auth middleware
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token" });

    try {
        const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ msg: "Invalid token" });
    }
};

// Get all short films with filters
router.get("/", async (req, res) => {
    try {
        const { genre, search, sort = 'latest' } = req.query;
        let query = {};

        if (genre && genre !== 'All') {
            query.genre = genre;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        let sortOption = { createdAt: -1 }; // latest first
        if (sort === 'popular') {
            sortOption = { views: -1 };
        }

        const films = await ShortFilm.find(query)
            .populate('uploadedBy', 'name')
            .sort(sortOption);

        res.json(films);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get single short film
router.get("/:id", async (req, res) => {
    try {
        const film = await ShortFilm.findById(req.params.id)
            .populate('uploadedBy', 'name')
            .populate('likes', 'name');

        if (!film) {
            return res.status(404).json({ msg: "Film not found" });
        }

        // Increment views
        film.views += 1;
        await film.save();

        res.json(film);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Upload short film
router.post("/upload", auth, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, description, genre, duration } = req.body;

        if (!req.files.video) {
            return res.status(400).json({ msg: "Video file is required" });
        }

        const film = await ShortFilm.create({
            title,
            description,
            videoUrl: req.files.video[0].filename,
            thumbnail: req.files.thumbnail ? req.files.thumbnail[0].filename : null,
            creator: req.user.name,
            genre,
            duration: parseInt(duration),
            status: 'pending',
            uploadedBy: req.user.id
        });

        res.json({ msg: "Short film uploaded successfully", film });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Like/Unlike film
router.post("/:id/like", auth, async (req, res) => {
    try {
        const film = await ShortFilm.findById(req.params.id);

        if (!film) {
            return res.status(404).json({ msg: "Film not found" });
        }

        const userId = req.user.id;
        const likeIndex = film.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            film.likes.splice(likeIndex, 1);
        } else {
            // Like
            film.likes.push(userId);
        }

        await film.save();
        res.json({ likes: film.likes.length, isLiked: likeIndex === -1 });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
    try {
        const film = await ShortFilm.findById(req.params.id);

        if (!film) {
            return res.status(404).json({ msg: "Film not found" });
        }

        const comment = {
            user: req.user.name,
            text: req.body.text
        };

        film.comments.push(comment);
        await film.save();

        res.json({ msg: "Comment added", comment });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get comments
router.get("/:id/comments", async (req, res) => {
    try {
        const film = await ShortFilm.findById(req.params.id).select('comments');
        res.json(film.comments);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
