import session from 'express-session';
import { connectRedis } from '../config/redis.js';
import { getRedisClient } from '../config/redis.js';
import { Session } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';


const RedisStore = connectRedis(session);

// Session configuration
const SESSION_CONFIG = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'omnidimension.sid'
};

// Create Redis store
let redisStore;
try {
  const redisClient = getRedisClient();
  redisStore = new RedisStore({
    client: redisClient,
    prefix: 'omnidimension:sess:'
  });
} catch (error) {
  logger.warn('Redis store not available, using memory store');
}

if (redisStore) {
  SESSION_CONFIG.store = redisStore;
}

export const sessionMiddleware = session(SESSION_CONFIG);

// Custom session management middleware
export const customSessionMiddleware = async (req, res, next) => {
  try {
    // Generate session ID if not present
    if (!req.sessionID) {
      req.sessionID = uuidv4();
    }

    // Check for existing session in database
    let sessionDoc = await Session.findOne({ sessionId: req.sessionID });

    if (!sessionDoc && req.user) {
      // Create new session document
      sessionDoc = new Session({
        sessionId: req.sessionID,
        userId: req.user._id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + SESSION_CONFIG.cookie.maxAge),
        metadata: {
          device: getDeviceInfo(req.get('User-Agent')),
          browser: getBrowserInfo(req.get('User-Agent')),
          referrer: req.get('Referer')
        }
      });

      await sessionDoc.save();
      logger.info(`New session created: ${req.sessionID} for user: ${req.user._id}`);
    } else if (sessionDoc) {
      // Update existing session
      await sessionDoc.updateActivity();
    }

    req.sessionDoc = sessionDoc;
    next();

  } catch (error) {
    logger.error('Session middleware error:', error);
    next(error);
  }
};

export const sessionAuth = async (req, res, next) => {
  try {
    // Check for session ID in cookies or headers
    const sessionId =
      req.cookies["omnidimension.sid"] ||
      req.headers["x-session-id"] ||
      req.sessionID;

    if (!sessionId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "No session found. Please login.",
        code: "NO_SESSION",
        timestamp: "2025-06-20 05:04:25",
      });
    }

    // Find active session in database
    const sessionDoc = await Session.findOne({
      sessionId: sessionId,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!sessionDoc || !sessionDoc.userId) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Session expired or invalid. Please login again.",
        code: "INVALID_SESSION",
        timestamp: "2025-06-20 05:04:25",
      });
    }

    // Check if user is active
    if (!sessionDoc.userId.isActive) {
      await sessionDoc.deleteOne();
      return res.status(401).json({
        error: "User not active",
        message: "User account is deactivated. Please contact support.",
        code: "USER_INACTIVE",
        timestamp: "2025-06-20 05:04:25",
      });
    }

    // Update session activity
    sessionDoc.lastActivity = new Date("2025-06-20 05:04:25");
    await sessionDoc.save();

    // Attach user and session to request
    req.user = sessionDoc.userId;
    req.sessionDoc = sessionDoc;
    req.sessionId = sessionId;

    logger.auth("session_validated", sessionDoc.userId._id, true, {
      sessionId: sessionId,
      timestamp: "2025-06-20 05:04:25",
      currentUser: "ayush20244048",
    });

    next();
  } catch (error) {
    logger.error("Session authentication error:", error, {
      timestamp: "2025-06-20 05:04:25",
      currentUser: "ayush20244048",
    });

    res.status(500).json({
      error: "Authentication error",
      message: "Internal server error during authentication",
      code: "AUTH_ERROR",
      timestamp: "2025-06-20 05:04:25",
    });
  }
};

// Helper functions
function getDeviceInfo(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile';
  } else if (/Tablet/.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

function getBrowserInfo(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'other';
}

// Session cleanup job
export const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.cleanupExpired();
    logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
  } catch (error) {
    logger.error('Session cleanup error:', error);
  }
};

// Start session cleanup interval
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour