import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    sessionId: req.sessionId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let response = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    status = HTTP_STATUS.BAD_REQUEST;
    response = {
      error: 'Validation Error',
      message: 'Please check your input data',
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    };
  } else if (error.name === 'CastError') {
    // MongoDB cast error (invalid ObjectId)
    status = HTTP_STATUS.BAD_REQUEST;
    response = {
      error: 'Invalid ID',
      message: 'The provided ID is not valid',
      code: 'INVALID_ID'
    };
  } else if (error.code === 11000) {
    // MongoDB duplicate key error
    status = HTTP_STATUS.CONFLICT;
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    response = {
      error: 'Duplicate Error',
      message: `${field} '${value}' already exists`,
      code: 'DUPLICATE_ERROR',
      field,
      value
    };
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    status = HTTP_STATUS.UNAUTHORIZED;
    response = {
      error: 'Invalid Token',
      message: 'The provided token is invalid',
      code: 'INVALID_TOKEN'
    };
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired
    status = HTTP_STATUS.UNAUTHORIZED;
    response = {
      error: 'Token Expired',
      message: 'The provided token has expired',
      code: 'TOKEN_EXPIRED'
    };
  } else if (error.name === 'MulterError') {
    // File upload error
    status = HTTP_STATUS.BAD_REQUEST;
    if (error.code === 'LIMIT_FILE_SIZE') {
      response = {
        error: 'File Too Large',
        message: 'The uploaded file is too large',
        code: 'FILE_TOO_LARGE'
      };
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      response = {
        error: 'Too Many Files',
        message: 'Too many files uploaded',
        code: 'TOO_MANY_FILES'
      };
    } else {
      response = {
        error: 'Upload Error',
        message: error.message,
        code: 'UPLOAD_ERROR'
      };
    }
  } else if (error.status || error.statusCode) {
    // HTTP errors with status codes
    status = error.status || error.statusCode;
    response = {
      error: error.name || 'HTTP Error',
      message: error.message,
      code: error.code || 'HTTP_ERROR'
    };
  } else if (error.message.includes('ECONNREFUSED')) {
    // Database connection error
    status = HTTP_STATUS.SERVICE_UNAVAILABLE;
    response = {
      error: 'Service Unavailable',
      message: 'Database connection failed',
      code: 'DATABASE_ERROR'
    };
  } else if (error.message.includes('timeout')) {
    // Timeout errors
    status = HTTP_STATUS.REQUEST_TIMEOUT;
    response = {
      error: 'Request Timeout',
      message: 'The request took too long to process',
      code: 'TIMEOUT_ERROR'
    };
  }

  // Add development-specific error details
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = {
      name: error.name,
      originalMessage: error.message
    };
  }

  // Send error response
  res.status(status).json(response);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
};

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR');
  }
}