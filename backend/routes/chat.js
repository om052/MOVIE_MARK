const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const Report = require("../models/Report");
const User = require("../models/User");
const MovieChatroom = require("../models/MovieChatroom");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const adminAuth = require("../middleware/admin");

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

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

// Get messages for a project
router.get("/:projectId", auth, async (req, res) => {
    try {
        const messages = await ChatMessage.find({ projectId: req.params.projectId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Delete message
router.delete("/:messageId", auth, async (req, res) => {
    try {
        const message = await ChatMessage.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        await ChatMessage.findByIdAndDelete(req.params.messageId);
        res.json({ msg: "Message deleted" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Edit message
router.put("/:messageId", auth, async (req, res) => {
    try {
        const message = await ChatMessage.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        message.message = req.body.message;
        message.edited = true;
        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Upload file with validation
router.post("/upload", upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "No file uploaded" });
        }

        // File validation
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(req.file.mimetype)) {
            // Delete the uploaded file
            const fs = require('fs');
            const path = require('path');
            fs.unlinkSync(path.join(__dirname, '../../uploads', req.file.filename));
            return res.status(400).json({ msg: "File type not allowed. Allowed types: images, audio, PDF, DOC, DOCX, TXT" });
        }

        if (req.file.size > maxSize) {
            // Delete the uploaded file
            const fs = require('fs');
            const path = require('path');
            fs.unlinkSync(path.join(__dirname, '../../uploads', req.file.filename));
            return res.status(400).json({ msg: "File size too large. Maximum size: 10MB" });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, fileUrl, fileName: req.file.originalname, fileType: req.file.mimetype });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Report a message
router.post("/:messageId/report", auth, async (req, res) => {
    try {
        const { reason, description } = req.body;
        const message = await ChatMessage.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        // Check if user already reported this message
        const existingReport = await Report.findOne({
            messageId: req.params.messageId,
            reporter: req.user.id
        });
        if (existingReport) return res.status(400).json({ msg: "Already reported" });

        const report = new Report({
            messageId: req.params.messageId,
            reporter: req.user.id,
            reason,
            description
        });
        await report.save();

        // Increment report count on message
        message.reportCount += 1;
        message.reported = true;
        await message.save();

        res.json({ msg: "Message reported successfully" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Get all reports
router.get("/admin/reports", adminAuth, async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('messageId')
            .populate('reporter', 'name email')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Update report status
router.put("/admin/reports/:reportId", adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const report = await Report.findByIdAndUpdate(
            req.params.reportId,
            {
                status,
                reviewedBy: req.user.id,
                reviewedAt: new Date()
            },
            { new: true }
        );
        res.json(report);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Global delete message
router.delete("/admin/:messageId", adminAuth, async (req, res) => {
    try {
        const message = await ChatMessage.findByIdAndDelete(req.params.messageId);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        // Delete associated reports
        await Report.deleteMany({ messageId: req.params.messageId });

        res.json({ msg: "Message deleted globally" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Global edit message
router.put("/admin/:messageId", adminAuth, async (req, res) => {
    try {
        const message = await ChatMessage.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: "Message not found" });

        message.message = req.body.message;
        message.edited = true;
        await message.save();

        res.json(message);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Block/unblock user globally in chat
router.put("/admin/users/:userId/block", adminAuth, async (req, res) => {
    try {
        const { blocked } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isBlocked: blocked },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Get chat analytics
router.get("/admin/analytics", adminAuth, async (req, res) => {
    try {
        const totalMessages = await ChatMessage.countDocuments();
        const totalReports = await Report.countDocuments();
        const activeChatrooms = await ChatMessage.distinct('projectId').length;
        const blockedUsers = await User.countDocuments({ isBlocked: true });

        // Messages per day (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const messagesPerDay = await ChatMessage.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json({
            totalMessages,
            totalReports,
            activeChatrooms,
            blockedUsers,
            messagesPerDay
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Admin: Export chat data
router.get("/admin/export/:projectId", adminAuth, async (req, res) => {
    try {
        const messages = await ChatMessage.find({ projectId: req.params.projectId })
            .populate('sender', 'name email')
            .sort({ createdAt: 1 });

        const csvData = messages.map(msg => ({
            timestamp: msg.createdAt.toISOString(),
            sender: msg.sender.name,
            email: msg.sender.email,
            role: msg.role,
            message: msg.message,
            type: msg.messageType,
            edited: msg.edited,
            reported: msg.reported,
            blocked: msg.blocked
        }));

        res.json(csvData);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
