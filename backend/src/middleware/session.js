/**
 * Session Middleware - Fixed Cookie Names
 * Current Time: 2025-06-20 09:25:12 UTC
 * Current User: ayush20244048
 */

import session from "express-session";
import { connectRedis } from "../config/redis.js";
import { getRedisClient } from "../config/redis.js";
import { Session } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

const RedisStore = connectRedis(session);

const SESSION_CONFIG = {
  secret: process.env.SESSION_SECRET || "your-secret-key-omnidimension-2025",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  },
  name: "sessionId", // CHANGED: Match what auth routes expect
};

// Create Redis store
let redisStore;
try {
  const redisClient = getRedisClient();
  redisStore = new RedisStore({
    client: redisClient,
    prefix: "omnidimension:sess:",
  });
  logger.info("Redis store connected for sessions at 2025-06-20 09:25:12");
} catch (error) {
  logger.warn(
    "Redis store not available, using memory store at 2025-06-20 09:25:12"
  );
}

if (redisStore) {
  SESSION_CONFIG.store = redisStore;
}

export const sessionMiddleware = session(SESSION_CONFIG);

// Updated session authentication to match auth middleware
export const sessionAuth = async (req, res, next) => {
  try {
    // Check for session ID in cookies or headers - MATCH auth middleware
    const sessionId = req.cookies.sessionId || req.headers["x-session-id"];

    if (!sessionId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "No session found. Please login.",
        code: "NO_SESSION",
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });
    }

    // Find active session in database - MATCH auth middleware logic
    const sessionDoc = await Session.findOne({
      sessionId: sessionId,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!sessionDoc || !sessionDoc.userId) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Session expired or invalid. Please login again.",
        code: "INVALID_SESSION",
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });
    }

    // Check if user is active
    if (!sessionDoc.userId.isActive) {
      await sessionDoc.deleteOne();
      return res.status(401).json({
        error: "User not active",
        message: "User account is deactivated. Please contact support.",
        code: "USER_INACTIVE",
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });
    }

    // Update session activity with current time
    sessionDoc.lastActivity = new Date("2025-06-20 09:25:12");
    await sessionDoc.save();

    // Update user last activity
    sessionDoc.userId.lastActivity = new Date("2025-06-20 09:25:12");
    await sessionDoc.userId.save();

    // Attach user and session to request - MATCH auth middleware
    req.user = sessionDoc.userId;
    req.session = sessionDoc; // Use 'session' not 'sessionDoc'
    req.sessionId = sessionId;

    logger.debug("Session validated successfully", {
      userId: sessionDoc.userId._id,
      sessionId: sessionId,
      timestamp: "2025-06-20 09:25:12",
      currentUser: "ayush20244048",
    });

    next();
  } catch (error) {
    logger.error(
      "Session authentication error at 2025-06-20 09:25:12:",
      error,
      {
        currentUser: "ayush20244048",
      }
    );

    res.status(500).json({
      error: "Authentication error",
      message: "Internal server error during authentication",
      code: "AUTH_ERROR",
      timestamp: "2025-06-20 09:25:12",
    });
  }
};

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
        userAgent: req.get("User-Agent"),
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + SESSION_CONFIG.cookie.maxAge),
        metadata: {
          device: getDeviceInfo(req.get("User-Agent")),
          browser: getBrowserInfo(req.get("User-Agent")),
          referrer: req.get("Referer"),
          createdAt: "2025-06-20 09:25:12",
        },
      });

      await sessionDoc.save();
      logger.info(
        `New session created: ${req.sessionID} for user: ${req.user._id} at 2025-06-20 09:25:12`
      );
    } else if (sessionDoc) {
      // Update existing session
      await sessionDoc.updateActivity();
    }

    req.sessionDoc = sessionDoc;
    next();
  } catch (error) {
    logger.error("Session middleware error at 2025-06-20 09:25:12:", error);
    next(error);
  }
};

// Helper functions
function getDeviceInfo(userAgent) {
  if (!userAgent) return "unknown";

  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return "mobile";
  } else if (/Tablet/.test(userAgent)) {
    return "tablet";
  }
  return "desktop";
}

function getBrowserInfo(userAgent) {
  if (!userAgent) return "unknown";

  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "other";
}

// Session cleanup job
export const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.cleanupExpired();
    logger.info(
      `Cleaned up ${result.deletedCount} expired sessions at 2025-06-20 09:25:12`
    );
  } catch (error) {
    logger.error("Session cleanup error at 2025-06-20 09:25:12:", error);
  }
};

// Start session cleanup interval
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour

export default {
  sessionMiddleware,
  sessionAuth,
  customSessionMiddleware,
  cleanupExpiredSessions,
};
