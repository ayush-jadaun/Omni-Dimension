/**
 * Rate Limiting Middleware
 * Current Time: 2025-06-20 05:39:02 UTC
 * Current User: ayush20244048
 */

import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger.js";

// Note: Removing Redis store for rate limiting due to compatibility issues
// Will use memory store for now - in production, consider using a Redis-compatible store

// Global rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests",
    message:
      "You have exceeded the maximum number of requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
    timestamp: "2025-06-20 05:39:02",
    currentUser: "ayush20244048",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and system endpoints
    return (
      req.path === "/health" ||
      req.path === "/system-info" ||
      req.path.startsWith("/static/")
    );
  },
  handler: (req, res) => {
    logger.security("rate_limit_exceeded", "medium", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      timestamp: "2025-06-20 05:39:02",
      currentUser: "ayush20244048",
    });

    res.status(429).json({
      error: "Too many requests",
      message:
        "You have exceeded the maximum number of requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      timestamp: "2025-06-20 05:39:02",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// Authentication rate limiter
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: "Too many authentication attempts",
    message: "Too many login attempts. Please try again later.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    timestamp: "2025-06-20 05:39:02",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security("auth_rate_limit_exceeded", "high", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      timestamp: "2025-06-20 05:39:02",
      currentUser: "ayush20244048",
    });

    res.status(429).json({
      error: "Too many authentication attempts",
      message: "Too many login attempts. Please try again later.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      timestamp: "2025-06-20 05:39:02",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 API requests per minute
  message: {
    error: "API rate limit exceeded",
    message: "Too many API requests. Please slow down.",
    code: "API_RATE_LIMIT_EXCEEDED",
    timestamp: "2025-06-20 05:39:02",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security("api_rate_limit_exceeded", "medium", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      timestamp: "2025-06-20 05:39:02",
      currentUser: "ayush20244048",
    });

    res.status(429).json({
      error: "API rate limit exceeded",
      message: "Too many API requests. Please slow down.",
      code: "API_RATE_LIMIT_EXCEEDED",
      timestamp: "2025-06-20 05:39:02",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// Chat rate limiter
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 chat messages per minute
  message: {
    error: "Chat rate limit exceeded",
    message:
      "Too many chat messages. Please wait before sending another message.",
    code: "CHAT_RATE_LIMIT_EXCEEDED",
    timestamp: "2025-06-20 05:39:02",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security("chat_rate_limit_exceeded", "low", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id,
      timestamp: "2025-06-20 05:39:02",
      currentUser: "ayush20244048",
    });

    res.status(429).json({
      error: "Chat rate limit exceeded",
      message:
        "Too many chat messages. Please wait before sending another message.",
      code: "CHAT_RATE_LIMIT_EXCEEDED",
      timestamp: "2025-06-20 05:39:02",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

logger.system(
  "RateLimit",
  "configured",
  "Rate limiting configured with memory store",
  {
    timestamp: "2025-06-20 05:39:02",
    currentUser: "ayush20244048",
    note: "Redis store disabled due to compatibility issues",
  }
);

// Export all rate limiters
export default {
  globalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  chatRateLimiter,
};
