import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, Session } from '../models/index.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { 
  validateUserRegistration, 
  validateUserLogin, 
  validatePasswordChange 
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimiter, validateUserRegistration, asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;

  logger.info('User registration attempt:', { username, email });

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      error: 'User already exists',
      message: existingUser.email === email 
        ? 'An account with this email already exists' 
        : 'Username is already taken',
      code: 'USER_EXISTS'
    });
  }

  // Create new user
  const user = new User({
    username,
    email,
    password, // Will be hashed by pre-save middleware
    profile: {
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      timezone: 'UTC',
      preferences: {
        language: 'en',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    },
    isEmailVerified: false,
    loginCount: 0
  });

  await user.save();

  // Create initial session
  const sessionId = uuidv4();
  const session = new Session({
    sessionId,
    userId: user._id,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    metadata: {
      device: getDeviceType(req.get('User-Agent')),
      browser: getBrowserType(req.get('User-Agent')),
      referrer: req.get('Referer')
    }
  });

  await session.save();
  await user.updateLoginInfo();

  // Set session cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  logger.info('User registered successfully:', { 
    userId: user._id, 
    username, 
    sessionId 
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Account created successfully',
    user: user.toSafeObject(),
    session: {
      sessionId,
      expiresAt: session.expiresAt
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimiter, validateUserLogin, asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  logger.info('User login attempt:', { email });

  // Find user by email
  const user = await User.findActiveUser({ email });

  if (!user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    logger.warn('Invalid login attempt:', { email, ip: req.ip });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Deactivate any existing sessions for this user if not remember me
  if (!rememberMe) {
    await Session.updateMany(
      { userId: user._id, status: 'active' },
      { status: 'inactive' }
    );
  }

  // Create new session
  const sessionId = uuidv4();
  const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours

  const session = new Session({
    sessionId,
    userId: user._id,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    expiresAt: new Date(Date.now() + sessionDuration),
    metadata: {
      device: getDeviceType(req.get('User-Agent')),
      browser: getBrowserType(req.get('User-Agent')),
      rememberMe: rememberMe
    }
  });

  await session.save();
  await user.updateLoginInfo();

  // Set session cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: sessionDuration
  });

  logger.info('User logged in successfully:', { 
    userId: user._id, 
    username: user.username, 
    sessionId 
  });

  res.json({
    success: true,
    message: 'Login successful',
    user: user.toSafeObject(),
    session: {
      sessionId,
      expiresAt: session.expiresAt,
      rememberMe
    }
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.sessionId || req.headers['x-session-id'];

  if (sessionId) {
    // Deactivate session
    await Session.findOneAndUpdate(
      { sessionId },
      { status: 'inactive' }
    );

    logger.info('User logged out:', { 
      userId: req.user?._id, 
      sessionId 
    });
  }

  // Clear session cookie
  res.clearCookie('sessionId');

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh user session
// @access  Private
router.post('/refresh', asyncHandler(async (req, res) => {
  const sessionId = req.cookies.sessionId || req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'No session found',
      code: 'NO_SESSION'
    });
  }

  const session = await Session.findActiveSession(sessionId);

  if (!session) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Invalid or expired session',
      code: 'INVALID_SESSION'
    });
  }

  // Extend session by 24 hours
  await session.extend(24 * 60 * 60 * 1000);

  res.json({
    success: true,
    message: 'Session refreshed',
    session: {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt
    }
  });
}));

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', validatePasswordChange, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  // Verify current password
  const isValidPassword = await user.comparePassword(currentPassword);

  if (!isValidPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Invalid current password',
      code: 'INVALID_CURRENT_PASSWORD'
    });
  }

  // Update password
  user.password = newPassword; // Will be hashed by pre-save middleware
  await user.save();

  // Deactivate all other sessions for security
  await Session.updateMany(
    { 
      userId: user._id, 
      sessionId: { $ne: req.sessionId }
    },
    { status: 'inactive' }
  );

  logger.info('Password changed successfully:', { userId: user._id });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  res.json({
    success: true,
    user: req.user.toSafeObject(),
    session: {
      sessionId: req.sessionId,
      expiresAt: req.session?.expiresAt,
      lastActivity: req.session?.lastActivityAt
    }
  });
}));

// @route   POST /api/auth/verify-email
// @desc    Verify user email (placeholder for email verification)
// @access  Private
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { verificationCode } = req.body;
  const user = req.user;

  // In production, you would verify the code against a stored verification token
  // For now, we'll just mark the email as verified
  
  if (!verificationCode) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Verification code required',
      code: 'VERIFICATION_CODE_REQUIRED'
    });
  }

  user.isEmailVerified = true;
  await user.save();

  logger.info('Email verified successfully:', { userId: user._id });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// @route   GET /api/auth/sessions
// @desc    Get user's active sessions
// @access  Private
router.get('/sessions', asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    userId: req.user._id,
    status: 'active'
  }).sort({ lastActivityAt: -1 });

  const sessionData = sessions.map(session => ({
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    location: session.location,
    metadata: session.metadata,
    isCurrent: session.sessionId === req.sessionId
  }));

  res.json({
    success: true,
    sessions: sessionData,
    total: sessionData.length
  });
}));

// @route   DELETE /api/auth/sessions/:sessionId
// @desc    Terminate a specific session
// @access  Private
router.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (sessionId === req.sessionId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Cannot terminate current session',
      message: 'Use logout endpoint to terminate current session',
      code: 'CANNOT_TERMINATE_CURRENT_SESSION'
    });
  }

  const session = await Session.findOne({
    sessionId,
    userId: req.user._id
  });

  if (!session) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Session not found',
      code: 'SESSION_NOT_FOUND'
    });
  }

  await session.deactivate();

  logger.info('Session terminated:', { 
    userId: req.user._id, 
    terminatedSessionId: sessionId 
  });

  res.json({
    success: true,
    message: 'Session terminated successfully'
  });
}));

// Helper functions
function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile';
  } else if (/Tablet/.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

function getBrowserType(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'other';
}

export default router;