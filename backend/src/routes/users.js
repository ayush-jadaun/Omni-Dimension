import express from 'express';
import { User, Session, Conversation, Workflow } from '../models/index.js';
import { validateUserProfileUpdate } from '../middleware/validation.js';
import { requireOwnership } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    profile: user.toSafeObject()
  });
}));

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', validateUserProfileUpdate, asyncHandler(async (req, res) => {
  const updates = req.body;
  const user = req.user;

  // Update profile fields
  if (updates.firstName !== undefined) user.profile.firstName = updates.firstName;
  if (updates.lastName !== undefined) user.profile.lastName = updates.lastName;
  if (updates.phone !== undefined) user.profile.phone = updates.phone;
  if (updates.timezone !== undefined) user.profile.timezone = updates.timezone;
  
  if (updates.preferences) {
    user.profile.preferences = {
      ...user.profile.preferences,
      ...updates.preferences
    };
  }

  await user.save();

  logger.info('User profile updated:', { userId: user._id });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    profile: user.toSafeObject()
  });
}));

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.sessionId;

  // Get user statistics
  const [conversationStats, workflowStats, recentConversations, activeWorkflows] = await Promise.all([
    Conversation.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: '$statistics.messageCount' },
          averageResponseTime: { $avg: '$statistics.averageResponseTime' }
        }
      }
    ]),
    Workflow.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalWorkflows: { $sum: 1 },
          completedWorkflows: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageDuration: { $avg: '$actualDuration' }
        }
      }
    ]),
    Conversation.find({ userId, isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .select('title lastMessageAt statistics'),
    Workflow.find({ userId, status: { $in: ['pending', 'running'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('workflowId title type status progress createdAt')
  ]);

  const dashboard = {
    user: req.user.toSafeObject(),
    statistics: {
      conversations: conversationStats[0] || {
        totalConversations: 0,
        totalMessages: 0,
        averageResponseTime: 0
      },
      workflows: workflowStats[0] || {
        totalWorkflows: 0,
        completedWorkflows: 0,
        averageDuration: 0
      }
    },
    recentActivity: {
      conversations: recentConversations,
      workflows: activeWorkflows
    },
    session: {
      sessionId,
      lastActivity: req.session?.lastActivityAt,
      expiresAt: req.session?.expiresAt
    }
  };

  res.json({
    success: true,
    dashboard
  });
}));

// @route   GET /api/users/activity
// @desc    Get user activity history
// @access  Private
router.get('/activity', asyncHandler(async (req, res) => {
  const { timeRange = '7d', page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

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

  // Get combined activity from conversations and workflows
  const [conversations, workflows] = await Promise.all([
    Conversation.find({ userId, ...dateFilter })
      .select('title createdAt lastMessageAt statistics.messageCount')
      .sort({ createdAt: -1 }),
    Workflow.find({ userId, ...dateFilter })
      .select('workflowId title type status createdAt completedAt')
      .sort({ createdAt: -1 })
  ]);

  // Combine and sort activities
  const activities = [
    ...conversations.map(conv => ({
      id: conv._id,
      type: 'conversation',
      title: conv.title,
      createdAt: conv.createdAt,
      lastActivity: conv.lastMessageAt,
      metadata: {
        messageCount: conv.statistics.messageCount
      }
    })),
    ...workflows.map(wf => ({
      id: wf.workflowId,
      type: 'workflow',
      title: wf.title,
      createdAt: wf.createdAt,
      lastActivity: wf.completedAt || wf.createdAt,
      metadata: {
        workflowType: wf.type,
        status: wf.status
      }
    }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedActivities = activities.slice(startIndex, startIndex + parseInt(limit));

  res.json({
    success: true,
    activities: paginatedActivities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: activities.length,
      pages: Math.ceil(activities.length / parseInt(limit))
    },
    timeRange
  });
}));

// @route   GET /api/users/preferences
// @desc    Get user preferences
// @access  Private
router.get('/preferences', asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    preferences: user.profile.preferences || {}
  });
}));

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const { preferences } = req.body;
  const user = req.user;

  user.profile.preferences = {
    ...user.profile.preferences,
    ...preferences
  };

  await user.save();

  logger.info('User preferences updated:', { userId: user._id });

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    preferences: user.profile.preferences
  });
}));

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { confirmPassword } = req.body;
  const user = req.user;

  if (!confirmPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Password confirmation required',
      code: 'PASSWORD_CONFIRMATION_REQUIRED'
    });
  }

  // Verify password
  const isValidPassword = await user.comparePassword(confirmPassword);

  if (!isValidPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Invalid password',
      code: 'INVALID_PASSWORD'
    });
  }

  const userId = user._id;

  // Deactivate user instead of hard delete for data integrity
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  user.username = `deleted_${Date.now()}_${user.username}`;
  await user.save();

  // Deactivate all sessions
  await Session.updateMany(
    { userId },
    { status: 'inactive' }
  );

  // Mark conversations and workflows as inactive
  await Promise.all([
    Conversation.updateMany({ userId }, { isActive: false }),
    Workflow.updateMany({ userId }, { status: 'cancelled' })
  ]);

  logger.info('User account deleted:', { userId });

  // Clear session cookie
  res.clearCookie('sessionId');

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

export default router;