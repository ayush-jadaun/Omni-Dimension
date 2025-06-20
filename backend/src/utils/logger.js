import winston from "winston";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, "../../logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "2025-06-20 04:53:21" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "2025-06-20 04:53:21" }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      user: "ayush20244048",
      system: "omnidimension",
      ...meta,
    });
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: {
    service: "omnidimension-backend",
    user: "ayush20244048",
    version: "1.0.0",
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: join(logsDir, "omnidimension.log"),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true,
    }),

    // File transport for errors only
    new winston.transports.File({
      filename: join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true,
    }),

    // File transport for system events
    new winston.transports.File({
      filename: join(logsDir, "system.log"),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 3,
      level: "info",
    }),
  ],

  // Exit on handled exceptions
  exitOnError: false,
});

// Add custom logging methods
logger.agent = (agentName, message, meta = {}) => {
  logger.info(`[${agentName.toUpperCase()}] ${message}`, {
    agent: agentName,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

logger.workflow = (workflowId, step, message, meta = {}) => {
  logger.info(`[WORKFLOW:${workflowId}] ${step}: ${message}`, {
    workflowId,
    step,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

logger.api = (method, endpoint, statusCode, duration, meta = {}) => {
  logger.info(`[API] ${method} ${endpoint} - ${statusCode} (${duration}ms)`, {
    method,
    endpoint,
    statusCode,
    duration,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

logger.auth = (action, userId, success, meta = {}) => {
  logger.info(`[AUTH] ${action} - User: ${userId} - Success: ${success}`, {
    action,
    userId,
    success,
    timestamp: "2025-06-20 04:53:21",
    currentUser: "ayush20244048",
    ...meta,
  });
};

logger.system = (component, status, message, meta = {}) => {
  logger.info(`[SYSTEM:${component}] ${status}: ${message}`, {
    component,
    status,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

// Performance logging
logger.performance = (operation, duration, meta = {}) => {
  const level = duration > 5000 ? "warn" : duration > 2000 ? "info" : "debug";
  logger[level](`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

// Security logging
logger.security = (event, severity, details, meta = {}) => {
  const level =
    severity === "high" ? "error" : severity === "medium" ? "warn" : "info";
  logger[level](`[SECURITY:${severity.toUpperCase()}] ${event}`, {
    event,
    severity,
    details,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

// Database logging
logger.database = (operation, collection, result, meta = {}) => {
  logger.debug(`[DATABASE] ${operation} on ${collection}`, {
    operation,
    collection,
    result: typeof result === "object" ? JSON.stringify(result) : result,
    timestamp: "2025-06-20 04:53:21",
    user: "ayush20244048",
    ...meta,
  });
};

// Startup banner
logger.startup = () => {
  logger.info("🚀 OmniDimension Multi-Agent System Starting...");
  logger.info("📅 Current Time: 2025-06-20 04:53:21 UTC");
  logger.info("👤 Current User: ayush20244048");
  logger.info("🏗️ System Version: 1.0.0");
  logger.info("🌍 Environment: " + (process.env.NODE_ENV || "development"));
  logger.info("📊 Log Level: " + (process.env.LOG_LEVEL || "info"));
};

// Export logger
export { logger };
export default logger;
