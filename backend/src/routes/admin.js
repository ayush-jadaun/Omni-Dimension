import express from 'express';
import { User, Session, Conversation, Workflow, Task } from '../models/index.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getAgentStatus, getSystemHealth } from '../agents/index.js';
import { HTTP_STATUS, USER_ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All admin routes require admin role
router.use(requireRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Admin
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    userStats,
    sessionStats,
    conversationStats,
    workflowStats,
    systemHealth
  ] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
          newThisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    Session.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          todaysSessions: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    Conversation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalMessages: { $sum: '$statistics.messageCount' },
          averageLength: { $avg: '$statistics.messageCount' }
        }
      }
    ]),
    Workflow.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } }
        }
      }
    ]),
    getSystemHealth()
  ]);

  const dashboard = {
    users: userStats[0] || { total: 0, active: 0, verified: 0, newThisMonth: 0 },
    sessions: sessionStats[0] || { total: 0, active: 0, todaysSessions: 0 },
    conversations: conversationStats[0] || { total: 0, active: 0, totalMessages: 0, averageLength: 0 },
    workflows: workflowStats[0] || { total: 0, completed: 0, failed: 0, running: 0 },
    system: systemHealth,
    timestamp: new Date().toISOString()
  };

  res.json({
    success: true,
    dashboard
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Admin
router.get('/users', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    status, 
    role,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  let filter = {};
  
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (role) filter.role = role;

  const sort = {};
  sort[sortBy] = order === 'desc' ? -1 : 1;

  const users = await User.find(filter, '-password')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Admin
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [user, sessions, conversations, workflows] = await Promise.all([
    User.findById(id, '-password'),
    Session.find({ userId: id }).sort({ createdAt: -1 }).limit(10),
    Conversation.find({ userId: id }).sort({ lastMessageAt: -1 }).limit(5),
    Workflow.find({ userId: id }).sort({ createdAt: -1 }).limit(5)
  ]);

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    user,
    recentActivity: {
      sessions,
      conversations,
      workflows
    }
  });
}));

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Admin
router.put('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Only super admin can change roles
  if (updates.role && req.user.role !== USER_ROLES.SUPER_ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Insufficient permissions to change user role',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  // Apply updates
  Object.keys(updates).forEach(key => {
    if (key !== 'password') { // Don't allow password updates through this endpoint
      user[key] = updates[key];
    }
  });

  await user.save();

  logger.info('User updated by admin:', { 
    adminId: req.user._id, 
    targetUserId: id, 
    updates: Object.keys(updates) 
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    user: user.toSafeObject()
  });
}));

// @route   GET /api/admin/system/status
// @desc    Get system status
// @access  Admin
router.get('/system/status', asyncHandler(async (req, res) => {
  const [agentStatus, systemHealth] = await Promise.all([
    getAgentStatus(),
    getSystemHealth()
  ]);

  res.json({
    success: true,
    system: {
      agents: agentStatus,
      health: systemHealth,
      timestamp: new Date().toISOString()
    }
  });
}));

// @route   GET /api/admin/workflows
// @desc    Get all workflows (admin view)
// @access  Admin
router.get('/workflows', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    type,
    userId,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  let filter = {};
  
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (userId) filter.userId = userId;

  const sort = {};
  sort[sortBy] = order === 'desc' ? -1 : 1;

  const workflows = await Workflow.find(filter)
    .populate('userId', 'username email')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Workflow.countDocuments(filter);

  res.json({
    success: true,
    workflows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/admin/analytics
// @desc    Get system analytics
// @access  Admin
router.get('/analytics', asyncHandler(async (req, res) => {
  const { timeRange = '7d' } = req.query;

  let dateFilter = {};
  const now = new Date();
  
  switch (timeRange) {
    case '1d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
      break;
    case '7d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
      break;
    case '30d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
      break;
  }

  const [usageAnalytics, performanceAnalytics] = await Promise.all([
    // Usage analytics
    Promise.all([
      User.countDocuments({ ...dateFilter }),
      Session.countDocuments({ ...dateFilter }),
      Conversation.countDocuments({ ...dateFilter }),
      Workflow.countDocuments({ ...dateFilter })
    ]),
    // Performance analytics
    Promise.all([
      Workflow.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            averageDuration: { $avg: '$actualDuration' }
          }
        }
      ]),
      Task.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$agentType',
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            averageDuration: { $avg: '$duration' }
          }
        }
      ])
    ])
  ]);

  const analytics = {
    timeRange,
    usage: {
      newUsers: usageAnalytics[0],
      newSessions: usageAnalytics[1],
      newConversations: usageAnalytics[2],
      newWorkflows: usageAnalytics[3]
    },
    performance: {
      workflowsByType: performanceAnalytics[0],
      tasksByAgent: performanceAnalytics[1]
    },
    generatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    analytics
  });
}));

// @route   POST /api/admin/system/maintenance
// @desc    Trigger system maintenance tasks
// @access  Super Admin only
router.post('/system/maintenance', requireRole([USER_ROLES.SUPER_ADMIN]), asyncHandler(async (req, res) => {
  const { task } = req.body;

  logger.info('Maintenance task triggered:', { 
    task, 
    adminId: req.user._id 
  });

  let result;

  switch (task) {
    case 'cleanup_sessions':
      result = await Session.cleanupExpired();
      break;
    
    case 'cleanup_old_conversations':
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days old
      result = await Conversation.updateMany(
        { 
          lastMessageAt: { $lt: cutoffDate },
          isActive: true 
        },
        { isActive: false }
      );
      break;
    
    case 'cleanup_old_workflows':
      const workflowCutoffDate = new Date();
      workflowCutoffDate.setDate(workflowCutoffDate.getDate() - 30); // 30 days old
      result = await Workflow.deleteMany({
        status: { $in: ['completed', 'failed', 'cancelled'] },
        completedAt: { $lt: workflowCutoffDate }
      });
      break;
    
    default:
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Unknown maintenance task',
        code: 'UNKNOWN_TASK'
      });
  }

  res.json({
    success: true,
    message: `Maintenance task '${task}' completed`,
    result
  });
}));

export default router;