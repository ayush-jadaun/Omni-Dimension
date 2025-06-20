import { Session, User } from '../models/index.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionService {
  constructor() {
    this.redis = getRedisClient();
    this.sessionCache = new Map();
  }

  async createSession(userId, sessionData = {}) {
    try {
      const sessionId = uuidv4();
      const {
        userAgent,
        ipAddress,
        rememberMe = false,
        deviceInfo = {}
      } = sessionData;

      const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + sessionDuration);

      // Create session document
      const session = new Session({
        sessionId,
        userId,
        userAgent,
        ipAddress,
        expiresAt,
        metadata: {
          device: deviceInfo.device || 'unknown',
          browser: deviceInfo.browser || 'unknown',
          os: deviceInfo.os || 'unknown',
          rememberMe
        }
      });

      await session.save();

      // Cache session in Redis for fast access
      await this.cacheSession(sessionId, {
        userId: userId.toString(),
        expiresAt: expiresAt.toISOString(),
        metadata: session.metadata
      });

      // Update user login info
      const user = await User.findById(userId);
      if (user) {
        await user.updateLoginInfo();
      }

      logger.info('Session created:', { sessionId, userId });

      return {
        sessionId,
        expiresAt,
        rememberMe
      };

    } catch (error) {
      logger.error('Session creation failed:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(sessionId) {
    try {
      // Check cache first
      let sessionData = await this.getSessionFromCache(sessionId);
      
      if (!sessionData) {
        // Get from database
        const session = await Session.findActiveSession(sessionId);
        
        if (!session) {
          return null;
        }

        sessionData = {
          userId: session.userId.toString(),
          expiresAt: session.expiresAt.toISOString(),
          metadata: session.metadata,
          lastActivityAt: session.lastActivityAt.toISOString()
        };

        // Cache for future use
        await this.cacheSession(sessionId, sessionData);
      }

      // Check if session is expired
      if (new Date(sessionData.expiresAt) <= new Date()) {
        await this.destroySession(sessionId);
        return null;
      }

      return sessionData;

    } catch (error) {
      logger.error('Session retrieval failed:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId) {
    try {
      const now = new Date();

      // Update in database
      await Session.findOneAndUpdate(
        { sessionId },
        { lastActivityAt: now },
        { new: true }
      );

      // Update cache
      const cachedSession = await this.getSessionFromCache(sessionId);
      if (cachedSession) {
        cachedSession.lastActivityAt = now.toISOString();
        await this.cacheSession(sessionId, cachedSession);
      }

    } catch (error) {
      logger.error('Session activity update failed:', error);
    }
  }

  async extendSession(sessionId, additionalTime = 24 * 60 * 60 * 1000) {
    try {
      const newExpiresAt = new Date(Date.now() + additionalTime);

      // Update in database
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { 
          expiresAt: newExpiresAt,
          lastActivityAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Update cache
      const cachedSession = await this.getSessionFromCache(sessionId);
      if (cachedSession) {
        cachedSession.expiresAt = newExpiresAt.toISOString();
        cachedSession.lastActivityAt = new Date().toISOString();
        await this.cacheSession(sessionId, cachedSession);
      }

      logger.info('Session extended:', { sessionId, newExpiresAt });

      return {
        sessionId,
        expiresAt: newExpiresAt
      };

    } catch (error) {
      logger.error('Session extension failed:', error);
      throw error;
    }
  }

  async destroySession(sessionId) {
    try {
      // Remove from database
      await Session.findOneAndUpdate(
        { sessionId },
        { status: 'inactive' }
      );

      // Remove from cache
      await this.removeSessionFromCache(sessionId);

      logger.info('Session destroyed:', { sessionId });

    } catch (error) {
      logger.error('Session destruction failed:', error);
      throw error;
    }
  }

  async destroyAllUserSessions(userId, excludeSessionId = null) {
    try {
      // Deactivate all user sessions except the excluded one
      const query = { userId, status: 'active' };
      if (excludeSessionId) {
        query.sessionId = { $ne: excludeSessionId };
      }

      const sessions = await Session.find(query);
      
      await Session.updateMany(query, { status: 'inactive' });

      // Remove from cache
      for (const session of sessions) {
        await this.removeSessionFromCache(session.sessionId);
      }

      logger.info('All user sessions destroyed:', { 
        userId, 
        excludeSessionId, 
        count: sessions.length 
      });

      return sessions.length;

    } catch (error) {
      logger.error('User sessions destruction failed:', error);
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      const sessions = await Session.find({
        userId,
        status: 'active'
      }).sort({ lastActivityAt: -1 });

      return sessions.map(session => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        metadata: session.metadata,
        isExpired: session.isExpired
      }));

    } catch (error) {
      logger.error('Get user sessions failed:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    try {
      const result = await Session.cleanupExpired();
      
      // Also cleanup cache entries (could be optimized)
      // For now, we'll rely on Redis TTL

      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
      return result.deletedCount;

    } catch (error) {
      logger.error('Session cleanup failed:', error);
      return 0;
    }
  }

  // Cache operations
  async cacheSession(sessionId, sessionData) {
    try {
      const cacheKey = `session:${sessionId}`;
      const ttl = Math.floor((new Date(sessionData.expiresAt) - new Date()) / 1000);
      
      if (ttl > 0) {
        await this.redis.setEx(cacheKey, ttl, JSON.stringify(sessionData));
      }
    } catch (error) {
      logger.warn('Session cache store failed:', error);
    }
  }

  async getSessionFromCache(sessionId) {
    try {
      const cacheKey = `session:${sessionId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.warn('Session cache retrieval failed:', error);
      return null;
    }
  }

  async removeSessionFromCache(sessionId) {
    try {
      const cacheKey = `session:${sessionId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      logger.warn('Session cache removal failed:', error);
    }
  }

  // Session analytics
  async getSessionAnalytics(timeRange = '24h') {
    try {
      let dateFilter = {};
      const now = new Date();
      
      switch (timeRange) {
        case '1h':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } };
          break;
        case '24h':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
          break;
        case '7d':
          dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
          break;
      }

      const analytics = await Session.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            uniqueUsers: { $addToSet: '$userId' },
            averageDuration: {
              $avg: {
                $subtract: ['$lastActivityAt', '$createdAt']
              }
            },
            deviceBreakdown: {
              $push: '$metadata.device'
            },
            browserBreakdown: {
              $push: '$metadata.browser'
            }
          }
        },
        {
          $project: {
            totalSessions: 1,
            activeSessions: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            averageDuration: 1,
            deviceBreakdown: 1,
            browserBreakdown: 1
          }
        }
      ]);

      return analytics[0] || {
        totalSessions: 0,
        activeSessions: 0,
        uniqueUsers: 0,
        averageDuration: 0,
        deviceBreakdown: [],
        browserBreakdown: []
      };

    } catch (error) {
      logger.error('Session analytics failed:', error);
      throw error;
    }
  }

  // Session validation
  isValidSession(sessionData) {
    if (!sessionData) return false;
    
    const now = new Date();
    const expiresAt = new Date(sessionData.expiresAt);
    
    return expiresAt > now;
  }

  // Session metadata helpers
  parseUserAgent(userAgent) {
    if (!userAgent) return { device: 'unknown', browser: 'unknown', os: 'unknown' };

    let device = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = 'mobile';
    } else if (/Tablet/.test(userAgent)) {
      device = 'tablet';
    }

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { device, browser, os };
  }
}

export default new SessionService();