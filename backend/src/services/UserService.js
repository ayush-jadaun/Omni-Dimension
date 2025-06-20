import { User, Session, Conversation, Workflow } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';
import SessionService from './SessionService.js';

export class UserService {
  async createUser(userData) {
    try {
      const { username, email, password, ...profileData } = userData;

      // Check for existing user
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        throw new Error(
          existingUser.email === email 
            ? 'Email already registered' 
            : 'Username already taken'
        );
      }

      // Create user
      const user = new User({
        username,
        email,
        password, // Will be hashed by pre-save middleware
        profile: {
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || 'UTC',
          preferences: {
            language: profileData.language || 'en',
            notifications: {
              email: true,
              sms: false,
              push: true
            }
          }
        },
        isEmailVerified: false
      });

      await user.save();

      logger.info('User created successfully:', { 
        userId: user._id, 
        username, 
        email 
      });

      return {
        success: true,
        user: user.toSafeObject(),
        message: 'User created successfully'
      };

    } catch (error) {
      logger.error('User creation failed:', error);
      throw error;
    }
  }

  async authenticateUser(email, password) {
    try {
      const user = await User.findActiveUser({ email });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await user.comparePassword(password);

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update login info
      await user.updateLoginInfo();

      logger.info('User authenticated successfully:', { 
        userId: user._id, 
        email 
      });

      return {
        success: true,
        user: user.toSafeObject()
      };

    } catch (error) {
      logger.error('User authentication failed:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      return user.toSafeObject();

    } catch (error) {
      logger.error('Get user by ID failed:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      // Update profile fields
      if (updates.firstName !== undefined) {
        user.profile.firstName = updates.firstName;
      }
      if (updates.lastName !== undefined) {
        user.profile.lastName = updates.lastName;
      }
      if (updates.phone !== undefined) {
        user.profile.phone = updates.phone;
      }
      if (updates.timezone !== undefined) {
        user.profile.timezone = updates.timezone;
      }
      
      if (updates.preferences) {
        user.profile.preferences = {
          ...user.profile.preferences,
          ...updates.preferences
        };
      }

      await user.save();

      logger.info('User profile updated:', { userId });

      return {
        success: true,
        user: user.toSafeObject(),
        message: 'Profile updated successfully'
      };

    } catch (error) {
      logger.error('User profile update failed:', error);
      throw error;
    }
  }

  async changeUserPassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);

      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      // Invalidate all other sessions for security
      await SessionService.destroyAllUserSessions(userId);

      logger.info('User password changed:', { userId });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  async getUserDashboard(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      // Get user statistics
      const [conversationStats, workflowStats, recentActivity] = await Promise.all([
        this.getUserConversationStats(userId),
        this.getUserWorkflowStats(userId),
        this.getUserRecentActivity(userId)
      ]);

      return {
        user: user.toSafeObject(),
        statistics: {
          conversations: conversationStats,
          workflows: workflowStats
        },
        recentActivity,
        lastLogin: user.lastLoginAt,
        memberSince: user.createdAt
      };

    } catch (error) {
      logger.error('Get user dashboard failed:', error);
      throw error;
    }
  }

  async getUserConversationStats(userId) {
    try {
      const stats = await Conversation.aggregate([
        { $match: { userId, isActive: true } },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            totalMessages: { $sum: '$statistics.messageCount' },
            averageMessagesPerConversation: { $avg: '$statistics.messageCount' },
            averageResponseTime: { $avg: '$statistics.averageResponseTime' },
            totalTokens: { $sum: '$statistics.totalTokens' }
          }
        }
      ]);

      return stats[0] || {
        totalConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        averageResponseTime: 0,
        totalTokens: 0
      };

    } catch (error) {
      logger.error('Get conversation stats failed:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        averageResponseTime: 0,
        totalTokens: 0
      };
    }
  }

  async getUserWorkflowStats(userId) {
    try {
      const stats = await Workflow.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalWorkflows: { $sum: 1 },
            completedWorkflows: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedWorkflows: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            averageDuration: { $avg: '$actualDuration' },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        averageDuration: 0,
        successRate: 0
      };

    } catch (error) {
      logger.error('Get workflow stats failed:', error);
      return {
        totalWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        averageDuration: 0,
        successRate: 0
      };
    }
  }

  async getUserRecentActivity(userId, limit = 10) {
    try {
      const [recentConversations, recentWorkflows] = await Promise.all([
        Conversation.find({ userId, isActive: true })
          .sort({ lastMessageAt: -1 })
          .limit(limit / 2)
          .select('title lastMessageAt statistics.messageCount'),
        Workflow.find({ userId })
          .sort({ createdAt: -1 })
          .limit(limit / 2)
          .select('workflowId title type status createdAt completedAt')
      ]);

      // Combine and sort by date
      const activities = [
        ...recentConversations.map(conv => ({
          id: conv._id,
          type: 'conversation',
          title: conv.title,
          date: conv.lastMessageAt,
          metadata: {
            messageCount: conv.statistics.messageCount
          }
        })),
        ...recentWorkflows.map(wf => ({
          id: wf.workflowId,
          type: 'workflow',
          title: wf.title,
          date: wf.completedAt || wf.createdAt,
          metadata: {
            workflowType: wf.type,
            status: wf.status
          }
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
       .slice(0, limit);

      return activities;

    } catch (error) {
      logger.error('Get recent activity failed:', error);
      return [];
    }
  }

  async deactivateUser(userId, reason = 'User requested') {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Deactivate user
      user.isActive = false;
      await user.save();

      // Deactivate all sessions
      await SessionService.destroyAllUserSessions(userId);

      // Mark conversations and workflows as inactive
      await Promise.all([
        Conversation.updateMany(
          { userId }, 
          { isActive: false }
        ),
        Workflow.updateMany(
          { userId, status: { $in: ['pending', 'running'] } }, 
          { status: 'cancelled' }
        )
      ]);

      logger.info('User deactivated:', { userId, reason });

      return {
        success: true,
        message: 'User account deactivated successfully'
      };

    } catch (error) {
      logger.error('User deactivation failed:', error);
      throw error;
    }
  }

  async getUserActivity(userId, timeRange = '7d', page = 1, limit = 20) {
    try {
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

      // Get activities from both conversations and workflows
      const [conversations, workflows] = await Promise.all([
        Conversation.find({ userId, ...dateFilter })
          .select('title createdAt lastMessageAt statistics.messageCount')
          .sort({ createdAt: -1 }),
        Workflow.find({ userId, ...dateFilter })
          .select('workflowId title type status createdAt completedAt')
          .sort({ createdAt: -1 })
      ]);

      // Combine and format activities
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
      const startIndex = (page - 1) * limit;
      const paginatedActivities = activities.slice(startIndex, startIndex + limit);

      return {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: activities.length,
          pages: Math.ceil(activities.length / limit)
        },
        timeRange
      };

    } catch (error) {
      logger.error('Get user activity failed:', error);
      throw error;
    }
  }

  async searchUsers(query, page = 1, limit = 20, filters = {}) {
    try {
      let searchFilter = {};

      // Build search query
      if (query) {
        searchFilter.$or = [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { 'profile.firstName': { $regex: query, $options: 'i' } },
          { 'profile.lastName': { $regex: query, $options: 'i' } }
        ];
      }

      // Apply filters
      if (filters.isActive !== undefined) {
        searchFilter.isActive = filters.isActive;
      }
      if (filters.role) {
        searchFilter.role = filters.role;
      }
      if (filters.isEmailVerified !== undefined) {
        searchFilter.isEmailVerified = filters.isEmailVerified;
      }

      const users = await User.find(searchFilter, '-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(searchFilter);

      return {
        users: users.map(user => user.toSafeObject()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('User search failed:', error);
      throw error;
    }
  }

  async verifyUserEmail(userId, verificationCode) {
    try {
      // In a production environment, you would validate the verification code
      // against a stored token with expiration
      
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      if (user.isEmailVerified) {
        return {
          success: true,
          message: 'Email already verified'
        };
      }

      // For now, we'll just mark as verified
      // In production, validate the code first
      user.isEmailVerified = true;
      await user.save();

      logger.info('Email verified:', { userId });

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  async getUserPreferences(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      return {
        preferences: user.profile.preferences || {},
        timezone: user.profile.timezone || 'UTC',
        language: user.profile.preferences?.language || 'en'
      };

    } catch (error) {
      logger.error('Get user preferences failed:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      user.profile.preferences = {
        ...user.profile.preferences,
        ...preferences
      };

      await user.save();

      logger.info('User preferences updated:', { userId });

      return {
        success: true,
        preferences: user.profile.preferences,
        message: 'Preferences updated successfully'
      };

    } catch (error) {
      logger.error('Update user preferences failed:', error);
      throw error;
    }
  }
}

export default new UserService();