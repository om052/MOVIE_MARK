const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const User = require("../models/User");
const Script = require("../models/Script");

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

// Send join request
router.post("/send", auth, async (req, res) => {
    try {
        const { projectId, role, message } = req.body;

        // Check if project exists and user is not already a collaborator
        const project = await Script.findById(projectId);
        if (!project) {
            return res.status(404).json({ msg: "Project not found" });
        }

        // Check if user already sent a request
        const existingRequest = await Request.findOne({
            sender: req.user.id,
            project: projectId,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingRequest) {
            return res.status(400).json({ msg: "You already have a pending or accepted request for this project" });
        }

        // Check if user is already a collaborator
        if (project.collaborators.some(id => id.toString() === req.user.id)) {
            return res.status(400).json({ msg: "You are already a collaborator on this project" });
        }

        const request = await Request.create({
            sender: req.user.id,
            receiver: project.uploadedBy,
            project: projectId,
            role,
            message,
            status: 'pending'
        });

        const populatedRequest = await Request.findById(request._id)
            .populate('sender', 'name photo')
            .populate('receiver', 'name')
            .populate('project', 'title');

        res.json({ msg: "Request sent successfully", request: populatedRequest });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get sent requests
router.get("/sent", auth, async (req, res) => {
    try {
        const requests = await Request.find({ sender: req.user.id })
            .populate('receiver', 'name photo')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get received requests
router.get("/received", auth, async (req, res) => {
    try {
        const requests = await Request.find({ receiver: req.user.id })
            .populate('sender', 'name photo role')
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Accept request
router.post("/:id/accept", auth, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('sender')
            .populate('project');

        if (!request) {
            return res.status(404).json({ msg: "Request not found" });
        }

        if (request.receiver.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: "Request already processed" });
        }

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Add user to project collaborators
        const project = await Script.findById(request.project._id);
        if (!project.collaborators.includes(request.sender._id)) {
            project.collaborators.push(request.sender._id);
            await project.save();
        }

        res.json({ msg: "Request accepted", request });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Reject request
router.post("/:id/reject", auth, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ msg: "Request not found" });
        }

        if (request.receiver.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: "Request already processed" });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ msg: "Request rejected", request });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get available projects to join (not created by user and not already requested)
router.get("/projects", auth, async (req, res) => {
    try {
        const userRequests = await Request.find({
            sender: req.user.id,
            status: { $in: ['pending', 'accepted'] }
        }).select('project');

        const requestedProjectIds = userRequests.map(r => r.project.toString());

        const projects = await Script.find({
            uploadedBy: { $ne: req.user.id },
            _id: { $nin: requestedProjectIds },
            collaborators: { $ne: req.user.id }
        }).select('title description genre category author');

        res.json(projects);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
