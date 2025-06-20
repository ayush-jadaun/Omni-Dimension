/**
 * Authentication Middleware - Fixed for Consistency
 * Current Time: 2025-06-20 09:25:12 UTC
 * Current User: ayush20244048
 */

import jwt from "jsonwebtoken";
import { User, Session } from "../models/index.js";
import { HTTP_STATUS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

// Skip authentication for these paths
const SKIP_AUTH_PATHS = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/health",
  "/system-info",
  "/api-status",
  "/docs",
  "/api", // Only the root /api
  "/",
];

export const authMiddleware = async (req, res, next) => {
  try {
    // Skip authentication for public routes
    if (SKIP_AUTH_PATHS.includes(req.path) || req.path === "/api") {
      return next();
    }

    // Check for session ID in cookies - MATCH session middleware
    const sessionId = req.cookies.sessionId || req.headers["x-session-id"];

    if (!sessionId) {
      logger.warn("No session ID found in request", {
        path: req.path,
        cookies: Object.keys(req.cookies),
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: "Authentication required",
        message: "No session found. Please login.",
        code: "NO_SESSION",
        timestamp: "2025-06-20 09:25:12",
        debug: {
          path: req.path,
          hasCookies: Object.keys(req.cookies).length > 0,
          cookieNames: Object.keys(req.cookies),
        },
      });
    }

    // Find active session
    const session = await Session.findOne({
      sessionId: sessionId,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!session) {
      logger.warn("Invalid or expired session", {
        sessionId: sessionId.substring(0, 10) + "...",
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: "Invalid session",
        message: "Session expired or invalid. Please login again.",
        code: "INVALID_SESSION",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    // Check if user exists and is active
    const user = session.userId || (await User.findById(session.userId));

    if (!user || !user.isActive) {
      await session.deleteOne();
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: "User not found or inactive",
        message: "Please contact support.",
        code: "USER_INACTIVE",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    // Update session activity with current time
    session.lastActivity = new Date("2025-06-20 09:25:12");
    await session.save();

    // Update user last activity
    user.lastActivity = new Date("2025-06-20 09:25:12");
    await user.save();

    // Attach user and session to request
    req.user = user;
    req.session = session;
    req.sessionId = sessionId;

    logger.debug("User authenticated successfully", {
      userId: user._id,
      username: user.username,
      role: user.role,
      sessionId: sessionId.substring(0, 10) + "...",
      timestamp: "2025-06-20 09:25:12",
      currentUser: "ayush20244048",
    });

    next();
  } catch (error) {
    logger.error(
      "Authentication middleware error at 2025-06-20 09:25:12:",
      error,
      {
        currentUser: "ayush20244048",
      }
    );
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: "Authentication error",
      message: "Internal server error during authentication",
      code: "AUTH_ERROR",
      timestamp: "2025-06-20 09:25:12",
    });
  }
};

// Session-based authentication (alias for consistency)
export const sessionAuth = authMiddleware;

// Middleware to require specific roles
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: "Authentication required",
        message: "Please login to access this resource",
        code: "NO_AUTH",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      logger.warn("insufficient_permissions", {
        userId: req.user._id,
        userRoles: userRoles,
        requiredRoles: requiredRoles,
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: "Insufficient permissions",
        message: `Required role(s): ${requiredRoles.join(
          ", "
        )}. Current role: ${userRoles.join(", ")}`,
        code: "INSUFFICIENT_ROLE",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    logger.debug("Role check passed", {
      userId: req.user._id,
      userRoles: userRoles,
      requiredRoles: requiredRoles,
      timestamp: "2025-06-20 09:25:12",
      currentUser: "ayush20244048",
    });

    next();
  };
};

// Middleware to check if user owns resource
export const requireOwnership = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: "Authentication required",
        code: "NO_AUTH",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    // Allow admin access
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      return next();
    }

    // Check ownership
    const resourceUserId =
      req.params[resourceUserIdField] ||
      req.body[resourceUserIdField] ||
      req.query[resourceUserIdField];

    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      logger.warn("unauthorized_access_attempt", {
        userId: req.user._id,
        attemptedResource: resourceUserId,
        timestamp: "2025-06-20 09:25:12",
        currentUser: "ayush20244048",
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: "Access denied",
        message: "You can only access your own resources",
        code: "NOT_OWNER",
        timestamp: "2025-06-20 09:25:12",
      });
    }

    next();
  };
};

// Middleware for optional authentication
export const optionalAuth = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId || req.headers["x-session-id"];

    if (sessionId) {
      const session = await Session.findOne({
        sessionId: sessionId,
        expiresAt: { $gt: new Date() },
      }).populate("userId");

      if (session && session.userId && session.userId.isActive) {
        req.user = session.userId;
        req.session = session;
        req.sessionId = sessionId;

        // Update activity
        session.lastActivity = new Date("2025-06-20 09:25:12");
        await session.save();

        session.userId.lastActivity = new Date("2025-06-20 09:25:12");
        await session.userId.save();

        logger.debug("Optional auth successful", {
          userId: session.userId._id,
          sessionId: sessionId.substring(0, 10) + "...",
          timestamp: "2025-06-20 09:25:12",
          currentUser: "ayush20244048",
        });
      }
    }

    next();
  } catch (error) {
    logger.error(
      "Optional auth middleware error at 2025-06-20 09:25:12:",
      error,
      {
        currentUser: "ayush20244048",
      }
    );
    next(); // Continue without authentication
  }
};

// Admin authentication middleware
export const requireAdmin = [
  authMiddleware,
  requireRole(["admin", "super_admin"]),
];

// Super admin authentication middleware
export const requireSuperAdmin = [authMiddleware, requireRole("super_admin")];

// Export default
export default {
  authMiddleware,
  sessionAuth,
  requireRole,
  requireOwnership,
  optionalAuth,
  requireAdmin,
  requireSuperAdmin,
};
