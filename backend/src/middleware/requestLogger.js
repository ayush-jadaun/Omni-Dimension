import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  // Add request ID to request object
  req.requestId = requestId;

  // Log incoming request
  logger.info("Incoming request", {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    currentUser: req.user?.username || "anonymous",
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.info("Request completed", {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("Content-Length") || 0,
      timestamp: new Date().toISOString(),
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

export default requestLogger;
