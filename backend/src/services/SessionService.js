/**
 * Session Service - Fixed User ID Storage
 * Current Time: 2025-06-20 09:59:52 UTC
 * Current User: ayush20244048
 */

import { Session, User } from "../models/index.js";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

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
        deviceInfo = {},
      } = sessionData;

      // Ensure userId is a proper ObjectId string, not an object
      const cleanUserId = this.extractUserId(userId);
      if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
        throw new Error("Invalid user ID format");
      }

      const sessionDuration = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + sessionDuration);

      logger.info("🔑 Creating session at 2025-06-20 09:59:52:", {
        sessionId: sessionId.substring(0, 10) + "...",
        userId: cleanUserId,
        rememberMe,
        currentUser: "ayush20244048",
      });

      // Create session document with clean userId
      const session = new Session({
        sessionId,
        userId: cleanUserId, // Store as ObjectId string, not object
        userAgent,
        ipAddress,
        expiresAt,
        metadata: {
          device: deviceInfo.device || "unknown",
          browser: deviceInfo.browser || "unknown",
          os: deviceInfo.os || "unknown",
          rememberMe,
        },
      });

      await session.save();

      // Cache session with clean data
      await this.cacheSession(sessionId, {
        userId: cleanUserId, // Store only the ObjectId string
        expiresAt: expiresAt.toISOString(),
        metadata: session.metadata,
      });

      // Update user login info
      const user = await User.findById(cleanUserId);
      if (user) {
        await user.updateLoginInfo();
      }

      logger.info("✅ Session created successfully at 2025-06-20 09:59:52:", {
        sessionId: sessionId.substring(0, 10) + "...",
        userId: cleanUserId,
        currentUser: "ayush20244048",
      });

      return {
        sessionId,
        expiresAt,
        rememberMe,
      };
    } catch (error) {
      logger.error("❌ Session creation failed at 2025-06-20 09:59:52:", error);
      throw new Error("Failed to create session");
    }
  }

  async getSession(sessionId) {
    try {
      logger.debug("🔍 Getting session at 2025-06-20 09:59:52:", {
        sessionId: sessionId.substring(0, 10) + "...",
      });

      // Check cache first
      let sessionData = await this.getSessionFromCache(sessionId);

      if (!sessionData) {
        logger.debug("💾 Session not in cache, fetching from database");

        // Get from database
        const session = await Session.findOne({
          sessionId: sessionId,
          expiresAt: { $gt: new Date() },
        });

        if (!session) {
          logger.warn(
            "❌ Session not found in database at 2025-06-20 09:59:52"
          );
          return null;
        }

        // Extract clean userId
        const cleanUserId = this.extractUserId(session.userId);

        sessionData = {
          userId: cleanUserId, // Ensure it's a clean ObjectId string
          expiresAt: session.expiresAt.toISOString(),
          metadata: session.metadata,
          lastActivityAt: session.lastActivityAt.toISOString(),
        };

        logger.info("✅ Session found in database at 2025-06-20 09:59:52:", {
          sessionId: sessionId.substring(0, 10) + "...",
          userId: cleanUserId,
          expiresAt: sessionData.expiresAt,
        });

        // Cache for future use
        await this.cacheSession(sessionId, sessionData);
      } else {
        logger.debug("✅ Session found in cache at 2025-06-20 09:59:52");
      }

      // Check if session is expired
      if (new Date(sessionData.expiresAt) <= new Date()) {
        logger.warn("⚠️ Session expired at 2025-06-20 09:59:52");
        await this.destroySession(sessionId);
        return null;
      }

      // Ensure userId is clean
      sessionData.userId = this.extractUserId(sessionData.userId);

      return sessionData;
    } catch (error) {
      logger.error(
        "❌ Session retrieval failed at 2025-06-20 09:59:52:",
        error
      );
      return null;
    }
  }

  // Helper method to extract clean userId from various formats
  extractUserId(userId) {
    try {
      // If it's already a valid ObjectId string
      if (
        typeof userId === "string" &&
        mongoose.Types.ObjectId.isValid(userId)
      ) {
        return userId;
      }

      // If it's an ObjectId object
      if (userId && typeof userId === "object" && userId._id) {
        return userId._id.toString();
      }

      // If it's a stringified object (this is our problem case)
      if (typeof userId === "string" && userId.includes("{")) {
        logger.warn(
          "⚠️ Found stringified user object, extracting ObjectId at 2025-06-20 09:59:52"
        );

        // Try to extract ObjectId from the string
        const objectIdMatch = userId.match(/ObjectId\('([^']+)'\)/);
        if (objectIdMatch) {
          return objectIdMatch[1];
        }

        // Try to parse as JSON and extract _id
        try {
          const userObj = JSON.parse(userId);
          if (userObj._id) {
            return userObj._id.toString();
          }
        } catch (parseError) {
          logger.error(
            "❌ Failed to parse stringified user object at 2025-06-20 09:59:52:",
            parseError
          );
        }
      }

      // If it's a Mongoose document
      if (userId && userId.toString && typeof userId.toString === "function") {
        return userId.toString();
      }

      logger.error(
        "❌ Unable to extract valid userId at 2025-06-20 09:59:52:",
        {
          userId:
            typeof userId === "string"
              ? userId.substring(0, 100) + "..."
              : userId,
          type: typeof userId,
        }
      );

      throw new Error("Invalid userId format");
    } catch (error) {
      logger.error("❌ Error extracting userId at 2025-06-20 09:59:52:", error);
      throw error;
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
      logger.error(
        "❌ Session activity update failed at 2025-06-20 09:59:52:",
        error
      );
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
          lastActivityAt: new Date(),
        },
        { new: true }
      );

      if (!session) {
        throw new Error("Session not found");
      }

      // Update cache
      const cachedSession = await this.getSessionFromCache(sessionId);
      if (cachedSession) {
        cachedSession.expiresAt = newExpiresAt.toISOString();
        cachedSession.lastActivityAt = new Date().toISOString();
        await this.cacheSession(sessionId, cachedSession);
      }

      logger.info("✅ Session extended at 2025-06-20 09:59:52:", {
        sessionId: sessionId.substring(0, 10) + "...",
        newExpiresAt,
      });

      return {
        sessionId,
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      logger.error(
        "❌ Session extension failed at 2025-06-20 09:59:52:",
        error
      );
      throw error;
    }
  }

  async destroySession(sessionId) {
    try {
      // Remove from database
      await Session.findOneAndUpdate({ sessionId }, { status: "inactive" });

      // Remove from cache
      await this.removeSessionFromCache(sessionId);

      logger.info("✅ Session destroyed at 2025-06-20 09:59:52:", {
        sessionId: sessionId.substring(0, 10) + "...",
      });
    } catch (error) {
      logger.error(
        "❌ Session destruction failed at 2025-06-20 09:59:52:",
        error
      );
      throw error;
    }
  }

  async destroyAllUserSessions(userId, excludeSessionId = null) {
    try {
      const cleanUserId = this.extractUserId(userId);

      // Deactivate all user sessions except the excluded one
      const query = { userId: cleanUserId, status: "active" };
      if (excludeSessionId) {
        query.sessionId = { $ne: excludeSessionId };
      }

      const sessions = await Session.find(query);

      await Session.updateMany(query, { status: "inactive" });

      // Remove from cache
      for (const session of sessions) {
        await this.removeSessionFromCache(session.sessionId);
      }

      logger.info("✅ All user sessions destroyed at 2025-06-20 09:59:52:", {
        userId: cleanUserId,
        excludeSessionId: excludeSessionId?.substring(0, 10) + "...",
        count: sessions.length,
      });

      return sessions.length;
    } catch (error) {
      logger.error(
        "❌ User sessions destruction failed at 2025-06-20 09:59:52:",
        error
      );
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      const cleanUserId = this.extractUserId(userId);

      const sessions = await Session.find({
        userId: cleanUserId,
        status: "active",
      }).sort({ lastActivityAt: -1 });

      return sessions.map((session) => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        metadata: session.metadata,
        isExpired: session.isExpired,
      }));
    } catch (error) {
      logger.error(
        "❌ Get user sessions failed at 2025-06-20 09:59:52:",
        error
      );
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    try {
      const result = await Session.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      logger.info(
        `✅ Cleaned up ${result.deletedCount} expired sessions at 2025-06-20 09:59:52`
      );
      return result.deletedCount;
    } catch (error) {
      logger.error("❌ Session cleanup failed at 2025-06-20 09:59:52:", error);
      return 0;
    }
  }

  // Cache operations
  async cacheSession(sessionId, sessionData) {
    try {
      const cacheKey = `session:${sessionId}`;
      const ttl = Math.floor(
        (new Date(sessionData.expiresAt) - new Date()) / 1000
      );

      if (ttl > 0) {
        // Ensure we're caching clean data
        const cleanData = {
          userId: this.extractUserId(sessionData.userId),
          expiresAt: sessionData.expiresAt,
          metadata: sessionData.metadata,
          lastActivityAt: sessionData.lastActivityAt,
        };

        await this.redis.setEx(cacheKey, ttl, JSON.stringify(cleanData));
      }
    } catch (error) {
      logger.warn(
        "⚠️ Session cache store failed at 2025-06-20 09:59:52:",
        error
      );
    }
  }

  async getSessionFromCache(sessionId) {
    try {
      const cacheKey = `session:${sessionId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        // Ensure userId is clean when retrieving from cache
        data.userId = this.extractUserId(data.userId);
        return data;
      }

      return null;
    } catch (error) {
      logger.warn(
        "⚠️ Session cache retrieval failed at 2025-06-20 09:59:52:",
        error
      );
      return null;
    }
  }

  async removeSessionFromCache(sessionId) {
    try {
      const cacheKey = `session:${sessionId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      logger.warn(
        "⚠️ Session cache removal failed at 2025-06-20 09:59:52:",
        error
      );
    }
  }

  // Session analytics
  async getSessionAnalytics(timeRange = "24h") {
    try {
      let dateFilter = {};
      const now = new Date();

      switch (timeRange) {
        case "1h":
          dateFilter = {
            createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
          };
          break;
        case "24h":
          dateFilter = {
            createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          };
          break;
        case "7d":
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          };
          break;
      }

      const analytics = await Session.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            uniqueUsers: { $addToSet: "$userId" },
            averageDuration: {
              $avg: {
                $subtract: ["$lastActivityAt", "$createdAt"],
              },
            },
            deviceBreakdown: {
              $push: "$metadata.device",
            },
            browserBreakdown: {
              $push: "$metadata.browser",
            },
          },
        },
        {
          $project: {
            totalSessions: 1,
            activeSessions: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
            averageDuration: 1,
            deviceBreakdown: 1,
            browserBreakdown: 1,
          },
        },
      ]);

      return (
        analytics[0] || {
          totalSessions: 0,
          activeSessions: 0,
          uniqueUsers: 0,
          averageDuration: 0,
          deviceBreakdown: [],
          browserBreakdown: [],
        }
      );
    } catch (error) {
      logger.error(
        "❌ Session analytics failed at 2025-06-20 09:59:52:",
        error
      );
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
    if (!userAgent)
      return { device: "unknown", browser: "unknown", os: "unknown" };

    let device = "desktop";
    let browser = "unknown";
    let os = "unknown";

    // Device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device = "mobile";
    } else if (/Tablet/.test(userAgent)) {
      device = "tablet";
    }

    // Browser detection
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    // OS detection
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS")) os = "iOS";

    return { device, browser, os };
  }
}

export default new SessionService();
