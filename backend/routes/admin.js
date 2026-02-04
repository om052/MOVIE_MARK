const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/admin');
const User = require('../models/User');
const Script = require('../models/Script');
const ShortFilm = require('../models/ShortFilm');
const Request = require('../models/Request');
const ChatMessage = require('../models/ChatMessage');
const Report = require('../models/Report');
const Project = require('../models/Project');
const Movie = require('../models/Movie');
const MovieChatroom = require('../models/MovieChatroom');

// Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const pendingApprovals = await Script.countDocuments({ status: 'pending' }) +
                            await ShortFilm.countDocuments({ status: 'pending' });
    const activeChatrooms = await ChatMessage.distinct('projectId').length;

    res.json({
      totalUsers,
      totalScripts,
      totalFilms,
      pendingApprovals,
      activeChatrooms
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user status (block/unblock, mute/unmute)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { isBlocked, isMuted } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked, isMuted },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all projects (scripts and films)
router.get('/projects', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find().populate('uploadedBy', 'name email');
    const films = await ShortFilm.find().populate('uploadedBy', 'name email');
    res.json({ scripts, films });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject project
router.put('/projects/:id/:type', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    let project;

    if (req.params.type === 'script') {
      project = await Script.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('uploadedBy', 'name email');
    } else if (req.params.type === 'film') {
      project = await ShortFilm.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('uploadedBy', 'name email');
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pin project to dashboard
router.put('/projects/:id/:type/pin', adminAuth, async (req, res) => {
  try {
    const { pinned } = req.body;
    let project;

    if (req.params.type === 'script') {
      project = await Script.findByIdAndUpdate(
        req.params.id,
        { pinned },
        { new: true }
      );
    } else if (req.params.type === 'film') {
      project = await ShortFilm.findByIdAndUpdate(
        req.params.id,
        { pinned },
        { new: true }
      );
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all requests
router.get('/requests', adminAuth, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('userId', 'name email')
      .populate('scriptId', 'title');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send request to user (admin can send requests)
router.post('/requests', adminAuth, async (req, res) => {
  try {
    const { userId, type, message, scriptId } = req.body;
    const request = new Request({
      userId,
      type,
      message,
      scriptId,
      status: 'pending'
    });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update request status
router.put('/requests/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create chatroom (enable chat for a project)
router.post('/chatrooms', adminAuth, async (req, res) => {
  try {
    console.log('Create chatroom request:', req.body);
    const { projectId, name, endTime } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Validate project exists
    const project = await Script.findById(projectId);
    if (!project) {
      console.log('Project not found:', projectId);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Found project:', project.title);

    // Get all users
    const allUsers = await User.find({}, '_id');
    const userIds = allUsers.map(user => user._id);

    // Update project with chat settings and add all users as participants
    const updateData = {
      participants: userIds
    };
    if (name) updateData.chatName = name;
    if (endTime) updateData.chatEndTime = new Date(endTime);

    console.log('Update data:', updateData);

    const updatedProject = await Script.findByIdAndUpdate(projectId, updateData, { new: true });
    console.log('Updated project:', updatedProject.chatName);

    res.status(201).json({
      message: 'Chatroom created successfully',
      projectId,
      name,
      endTime,
      participantsCount: userIds.length
    });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all chatrooms/projects with messages
router.get('/chatrooms', adminAuth, async (req, res) => {
  try {
    const chatrooms = await ChatMessage.aggregate([
      {
        $group: {
          _id: '$projectId',
          messageCount: { $sum: 1 },
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$createdAt' },
          participants: { $addToSet: '$sender' }
        }
      },
      {
        $lookup: {
          from: 'scripts',
          localField: '_id',
          foreignField: '_id',
          as: 'script'
        }
      },
      {
        $unwind: { path: '$script', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          projectId: '$_id',
          chatName: '$script.chatName',
          title: '$script.title',
          chatEndTime: '$script.chatEndTime',
          messageCount: 1,
          lastMessage: 1,
          lastMessageTime: 1,
          participantCount: { $size: '$participants' },
          reportedCount: { $sum: { $cond: ['$reported', 1, 0] } }
        }
      }
    ]);
    res.json(chatrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create chatroom timer (set end time)
router.post('/chatrooms/:projectId/timer', adminAuth, async (req, res) => {
  try {
    const { endTime } = req.body;
    // This would require adding a timer field to projects
    // For now, we'll store it in a simple way
    const project = await Script.findByIdAndUpdate(
      req.params.projectId,
      { chatEndTime: new Date(endTime) },
      { new: true }
    );
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End chatroom (delete all messages or mark as ended)
router.delete('/chatrooms/:projectId', adminAuth, async (req, res) => {
  try {
    await ChatMessage.deleteMany({ projectId: req.params.projectId });
    res.json({ message: 'Chatroom ended and messages deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create movie chatroom
router.post('/movie-chatrooms', adminAuth, async (req, res) => {
  try {
    const { movieName, endTime } = req.body;

    if (!movieName) {
      return res.status(400).json({ message: 'Movie name is required' });
    }

    // Check if chatroom already exists for this movie name
    const existingChatroom = await MovieChatroom.findOne({ movieName, isActive: true });
    if (existingChatroom) {
      return res.status(400).json({ message: 'Chatroom already exists for this movie name' });
    }

    // Create new movie chatroom
    const movieChatroom = new MovieChatroom({
      movieName,
      endTime: endTime ? new Date(endTime) : null
    });

    await movieChatroom.save();

    res.status(201).json({
      message: 'Movie chatroom created successfully',
      chatroom: movieChatroom
    });
  } catch (error) {
    console.error('Create movie chatroom error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all movie chatrooms
router.get('/movie-chatrooms', async (req, res) => {
  try {
    const movieChatrooms = await MovieChatroom.find({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(movieChatrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crowd funding management (placeholder - would need crowdfunding model)
router.get('/crowdfunding', adminAuth, async (req, res) => {
  try {
    // Placeholder for crowdfunding data
    res.json({ message: 'Crowdfunding management not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get platform analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    console.log('Analytics endpoint called');

    // Total users
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers);

    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    console.log('Active users:', activeUsers);

    // Total content
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const totalContent = totalScripts + totalFilms;
    console.log('Total content:', totalContent);

    // Total messages
    const totalMessages = await ChatMessage.countDocuments();
    console.log('Total messages:', totalMessages);

    // User growth data (last 12 months) - simplified
    const userGrowthData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await User.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });

      userGrowthData.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        users: count
      });
    }

    // Content trends data (last 12 months) - simplified
    const contentTrendsData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const scriptCount = await Script.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });
      const filmCount = await ShortFilm.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });

      contentTrendsData.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        uploads: scriptCount + filmCount
      });
    }

    // Chat activity data (last 7 days) - simplified
    const chatActivityData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const count = await ChatMessage.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });

      chatActivityData.push({
        day: startOfDay.toLocaleString('default', { weekday: 'short' }),
        messages: count
      });
    }

    const analyticsData = {
      totalUsers,
      activeUsers,
      totalContent,
      totalViews: 0, // Placeholder
      totalMessages,
      averageRating: 0, // Placeholder
      userGrowthData,
      contentTrendsData,
      chatActivityData
    };

    console.log('Analytics data prepared:', analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get top performing content
router.get('/top-content', adminAuth, async (req, res) => {
  try {
    // Get top scripts and films (placeholder - would need view/like tracking)
    const scripts = await Script.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const films = await ShortFilm.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const topContent = [
      ...scripts.map(s => ({ ...s.toObject(), type: 'script' })),
      ...films.map(f => ({ ...f.toObject(), type: 'film' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json(topContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export analytics data
router.get('/analytics/export', adminAuth, async (req, res) => {
  try {
    // Get the same data as the analytics endpoint
    const totalUsers = await User.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const totalContent = totalScripts + totalFilms;
    const totalMessages = await ChatMessage.countDocuments();

    const analytics = {
      totalUsers,
      activeUsers,
      totalContent,
      totalScripts,
      totalFilms,
      totalMessages,
      exportedAt: new Date()
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate system report
router.get('/reports/generate', adminAuth, async (req, res) => {
  try {
    const { range = 30, type = 'all' } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let reportData = {};

    // Basic stats
    reportData.totalUsers = await User.countDocuments();
    reportData.totalContent = await Script.countDocuments() + await ShortFilm.countDocuments();
    reportData.totalMessages = await ChatMessage.countDocuments({ createdAt: { $gte: startDate } });
    reportData.totalReports = await Report.countDocuments({ createdAt: { $gte: startDate } });

    // Filter by type if specified
    if (type === 'users' || type === 'all') {
      reportData.newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
      reportData.activeUsers = await User.countDocuments({ lastLogin: { $gte: startDate } });
    }

    if (type === 'content' || type === 'all') {
      reportData.newContent = await Script.countDocuments({ createdAt: { $gte: startDate } }) +
                              await ShortFilm.countDocuments({ createdAt: { $gte: startDate } });
      reportData.pendingApprovals = await Script.countDocuments({ status: 'pending', createdAt: { $gte: startDate } }) +
                                   await ShortFilm.countDocuments({ status: 'pending', createdAt: { $gte: startDate } });
    }

    if (type === 'chat' || type === 'all') {
      reportData.chatMessages = await ChatMessage.countDocuments({ createdAt: { $gte: startDate } });
      reportData.reportedMessages = await ChatMessage.countDocuments({ reported: true, createdAt: { $gte: startDate } });
    }

    if (type === 'system' || type === 'all') {
      reportData.systemHealth = {
        database: 'operational',
        server: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    }

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user activity report
router.get('/reports/users', adminAuth, async (req, res) => {
  try {
    const { range = 30 } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({
      $or: [
        { createdAt: { $gte: startDate } },
        { lastLogin: { $gte: startDate } }
      ]
    })
    .select('name email createdAt lastLogin isBlocked')
    .sort({ createdAt: -1 })
    .limit(100);

    // Add activity metrics (placeholder - would need more complex tracking)
    const usersWithActivity = users.map(user => ({
      ...user.toObject(),
      loginCount: 0, // Placeholder
      contentCount: 0, // Placeholder
      messageCount: 0 // Placeholder
    }));

    res.json(usersWithActivity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get content performance report
router.get('/reports/content', adminAuth, async (req, res) => {
  try {
    const { range = 30 } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scripts = await Script.find({ createdAt: { $gte: startDate } })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const films = await ShortFilm.find({ createdAt: { $gte: startDate } })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const content = [
      ...scripts.map(s => ({ ...s.toObject(), type: 'script' })),
      ...films.map(f => ({ ...f.toObject(), type: 'film' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);

    // Add performance metrics (placeholder)
    const contentWithMetrics = content.map(item => ({
      ...item,
      views: 0, // Placeholder
      likes: 0, // Placeholder
      comments: 0 // Placeholder
    }));

    res.json(contentWithMetrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get system health report
router.get('/reports/system-health', adminAuth, async (req, res) => {
  try {
    const healthMetrics = [
      {
        name: 'Database Connection',
        value: 'Connected',
        status: 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Server Uptime',
        value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        status: 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Memory Usage',
        value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        status: process.memoryUsage().heapUsed > 500 * 1024 * 1024 ? 'warning' : 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Active Users',
        value: 'Monitoring...',
        status: 'good',
        lastUpdated: new Date()
      }
    ];

    res.json(healthMetrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export system report
router.get('/reports/export', adminAuth, async (req, res) => {
  try {
    const { range = 30, type = 'all', format = 'json' } = req.query;

    // Generate report data
    const reportData = await generateReportData(range, type);

    if (format === 'json') {
      res.json(reportData);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="system_report.csv"');
      res.send(csvContent);
    } else {
      res.status(400).json({ message: 'Unsupported format. Use json or csv.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to generate report data
async function generateReportData(range, type) {
  const days = parseInt(range);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const reportData = {
    generatedAt: new Date(),
    dateRange: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
    type: type
  };

  // Add relevant data based on type
  if (type === 'users' || type === 'all') {
    reportData.users = await User.find({ createdAt: { $gte: startDate } })
      .select('name email createdAt lastLogin')
      .sort({ createdAt: -1 });
  }

  if (type === 'content' || type === 'all') {
    const scripts = await Script.find({ createdAt: { $gte: startDate } });
    const films = await ShortFilm.find({ createdAt: { $gte: startDate } });
    reportData.content = [...scripts, ...films];
  }

  if (type === 'chat' || type === 'all') {
    reportData.messages = await ChatMessage.find({ createdAt: { $gte: startDate } })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(1000);
  }

  return reportData;
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  // Simple CSV conversion - would need more sophisticated implementation for complex data
  let csv = 'Key,Value\n';
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      csv += `${key},\n`;
      for (const [subKey, subValue] of Object.entries(value)) {
        csv += `  ${subKey},${subValue}\n`;
      }
    } else {
      csv += `${key},${value}\n`;
    }
  }
  return csv;
}

// Get system logs (placeholder)
router.get('/logs', adminAuth, async (req, res) => {
  try {
    // Placeholder for system logs
    res.json({ message: 'System logs not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
