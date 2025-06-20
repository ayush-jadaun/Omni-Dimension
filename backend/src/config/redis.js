/**
 * Redis Configuration and Utilities - FIXED
 * Current Date and Time: 2025-06-20 14:49:45 UTC
 * Current User: ayush20244048
 */

import { createClient } from "redis";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

let redisClient;
let redisSubscriber;
let redisPublisher;
let isConnected = false;

const REDIS_CONFIG = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    connectTimeout: 5000,
    lazyConnect: true,
  },
  database: 0,
};

export const connectRedis = async () => {
  try {
    logger.info("🔄 Connecting to Redis at 2025-06-20 14:49:45", {
      url: REDIS_CONFIG.url,
      currentUser: "ayush20244048",
    });

    // Main Redis client
    redisClient = createClient(REDIS_CONFIG);

    // Separate clients for pub/sub
    redisSubscriber = createClient(REDIS_CONFIG);
    redisPublisher = createClient(REDIS_CONFIG);

    // Enhanced error handlers
    redisClient.on("error", (err) => {
      logger.error("❌ Redis Client Error at 2025-06-20 14:49:45:", err);
      isConnected = false;
    });

    redisSubscriber.on("error", (err) => {
      logger.error("❌ Redis Subscriber Error at 2025-06-20 14:49:45:", err);
    });

    redisPublisher.on("error", (err) => {
      logger.error("❌ Redis Publisher Error at 2025-06-20 14:49:45:", err);
    });

    // Enhanced connection handlers
    redisClient.on("connect", () => {
      logger.info("✅ Redis client connected at 2025-06-20 14:49:45");
      isConnected = true;
    });

    redisClient.on("ready", () => {
      logger.info("✅ Redis client ready at 2025-06-20 14:49:45");
      isConnected = true;
    });

    redisClient.on("end", () => {
      logger.info("⚠️ Redis client connection ended at 2025-06-20 14:49:45");
      isConnected = false;
    });

    redisClient.on("disconnect", () => {
      logger.warn("⚠️ Redis client disconnected at 2025-06-20 14:49:45");
      isConnected = false;
    });

    // Connect all clients
    await Promise.all([
      redisClient.connect(),
      redisSubscriber.connect(),
      redisPublisher.connect(),
    ]);

    logger.info(
      "✅ All Redis clients connected successfully at 2025-06-20 14:49:45",
      {
        currentUser: "ayush20244048",
      }
    );

    isConnected = true;
  } catch (error) {
    logger.error(
      "❌ Failed to connect to Redis at 2025-06-20 14:49:45:",
      error
    );
    isConnected = false;
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    logger.warn("⚠️ Redis client is not connected at 2025-06-20 14:49:45");
    throw new Error("Redis client is not connected");
  }
  return redisClient;
};

export const getRedisSubscriber = () => {
  if (!redisSubscriber || !redisSubscriber.isOpen) {
    logger.warn("⚠️ Redis subscriber is not connected at 2025-06-20 14:49:45");
    throw new Error("Redis subscriber is not connected");
  }
  return redisSubscriber;
};

export const getRedisPublisher = () => {
  if (!redisPublisher || !redisPublisher.isOpen) {
    logger.warn("⚠️ Redis publisher is not connected at 2025-06-20 14:49:45");
    throw new Error("Redis publisher is not connected");
  }
  return redisPublisher;
};

export const closeRedis = async () => {
  try {
    logger.info("🔄 Closing Redis connections at 2025-06-20 14:49:45");

    const closePromises = [];

    if (redisClient && redisClient.isOpen) {
      closePromises.push(redisClient.quit());
    }

    if (redisSubscriber && redisSubscriber.isOpen) {
      closePromises.push(redisSubscriber.quit());
    }

    if (redisPublisher && redisPublisher.isOpen) {
      closePromises.push(redisPublisher.quit());
    }

    await Promise.all(closePromises);
    logger.info(
      "✅ All Redis connections closed successfully at 2025-06-20 14:49:45"
    );

    isConnected = false;
  } catch (error) {
    logger.error(
      "❌ Error closing Redis connections at 2025-06-20 14:49:45:",
      error
    );
    throw error;
  }
};

/**
 * FIXED: Enhanced publishMessage with proper validation
 */
export const publishMessage = async (channel, message) => {
  try {
    // CRITICAL: Validate inputs before proceeding
    if (!channel || typeof channel !== "string") {
      logger.error("❌ Invalid channel parameter at 2025-06-20 14:49:45:", {
        channel,
        channelType: typeof channel,
        currentUser: "ayush20244048",
      });
      throw new Error(`Invalid channel: ${channel} (type: ${typeof channel})`);
    }

    if (
      !message ||
      (typeof message !== "object" && typeof message !== "string")
    ) {
      logger.error("❌ Invalid message parameter at 2025-06-20 14:49:45:", {
        message,
        messageType: typeof message,
        currentUser: "ayush20244048",
      });
      throw new Error(`Invalid message: ${message} (type: ${typeof message})`);
    }

    // Check Redis connection
    if (!isConnected) {
      logger.warn(
        "⚠️ Redis not connected, attempting to reconnect at 2025-06-20 14:49:45"
      );
      await connectRedis();
    }

    const publisher = getRedisPublisher();

    // FIXED: Ensure message is properly structured
    const messageToSend =
      typeof message === "string"
        ? message
        : {
            ...message,
            timestamp: message.timestamp || new Date().toISOString(),
            id: message.id || crypto.randomUUID(),
            currentUser: "ayush20244048",
            publishedAt: "2025-06-20 14:49:45",
          };

    // FIXED: Validate message before stringifying
    let messageString;
    try {
      messageString =
        typeof messageToSend === "string"
          ? messageToSend
          : JSON.stringify(messageToSend);

      // Additional validation - ensure messageString is not empty
      if (!messageString || messageString.trim().length === 0) {
        throw new Error("Resulting message string is empty");
      }
    } catch (stringifyError) {
      logger.error("❌ Error stringifying message at 2025-06-20 14:49:45:", {
        error: stringifyError.message,
        messageToSend,
        currentUser: "ayush20244048",
      });
      throw new Error(`Failed to stringify message: ${stringifyError.message}`);
    }

    // Log the publish attempt for debugging
    logger.debug("📤 Publishing message at 2025-06-20 14:49:45:", {
      channel,
      messageLength: messageString.length,
      messagePreview: messageString.substring(0, 100),
      currentUser: "ayush20244048",
    });

    // FIXED: Publish with additional error handling
    const result = await publisher.publish(channel, messageString);

    logger.debug(
      `✅ Published message to channel ${channel} at 2025-06-20 14:49:45 (${result} subscribers)`
    );

    return result;
  } catch (error) {
    logger.error(
      `❌ Error publishing to channel ${
        channel || "undefined"
      } at 2025-06-20 14:49:45:`,
      {
        error: error.message,
        stack: error.stack,
        channel,
        messageType: typeof message,
        currentUser: "ayush20244048",
      }
    );

    // Don't re-throw in production to avoid breaking the workflow
    if (process.env.NODE_ENV === "production") {
      logger.warn("⚠️ Suppressing Redis publish error in production mode");
      return 0;
    }

    throw error;
  }
};

/**
 * FIXED: Enhanced subscribeToChannel with proper validation
 */
export const subscribeToChannel = async (channel, callback) => {
  try {
    // Validate inputs
    if (!channel || typeof channel !== "string") {
      throw new Error(`Invalid channel: ${channel}`);
    }

    if (!callback || typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    // Check Redis connection
    if (!isConnected) {
      logger.warn(
        "⚠️ Redis not connected, attempting to reconnect at 2025-06-20 14:49:45"
      );
      await connectRedis();
    }

    const subscriber = getRedisSubscriber();

    await subscriber.subscribe(channel, (message, receivedChannel) => {
      try {
        // FIXED: Validate message before parsing
        if (!message || typeof message !== "string") {
          logger.warn("⚠️ Received invalid message at 2025-06-20 14:49:45:", {
            message,
            messageType: typeof message,
            channel: receivedChannel,
            currentUser: "ayush20244048",
          });
          return;
        }

        const parsedMessage = JSON.parse(message);

        // Add metadata to parsed message
        parsedMessage.receivedAt = "2025-06-20 14:49:45";
        parsedMessage.receivedChannel = receivedChannel;

        callback(parsedMessage, receivedChannel);
      } catch (parseError) {
        logger.error(
          `❌ Error parsing message from channel ${receivedChannel} at 2025-06-20 14:49:45:`,
          {
            error: parseError.message,
            message: message?.substring(0, 100),
            currentUser: "ayush20244048",
          }
        );
      }
    });

    logger.debug(`✅ Subscribed to channel ${channel} at 2025-06-20 14:49:45`);
  } catch (error) {
    logger.error(
      `❌ Error subscribing to channel ${
        channel || "undefined"
      } at 2025-06-20 14:49:45:`,
      error
    );
    throw error;
  }
};

export const unsubscribeFromChannel = async (channel) => {
  try {
    if (!channel || typeof channel !== "string") {
      throw new Error(`Invalid channel: ${channel}`);
    }

    const subscriber = getRedisSubscriber();
    await subscriber.unsubscribe(channel);
    logger.debug(
      `✅ Unsubscribed from channel ${channel} at 2025-06-20 14:49:45`
    );
  } catch (error) {
    logger.error(
      `❌ Error unsubscribing from channel ${
        channel || "undefined"
      } at 2025-06-20 14:49:45:`,
      error
    );
    throw error;
  }
};

/**
 * FIXED: Add connection health check
 */
export const isRedisConnected = () => {
  return (
    isConnected &&
    redisClient?.isOpen &&
    redisSubscriber?.isOpen &&
    redisPublisher?.isOpen
  );
};

/**
 * FIXED: Add Redis health check function
 */
export const checkRedisHealth = async () => {
  try {
    if (!isRedisConnected()) {
      return { healthy: false, message: "Redis clients not connected" };
    }

    // Test ping to all clients
    const pingResults = await Promise.allSettled([
      redisClient.ping(),
      redisSubscriber.ping(),
      redisPublisher.ping(),
    ]);

    const allHealthy = pingResults.every(
      (result) => result.status === "fulfilled"
    );

    return {
      healthy: allHealthy,
      message: allHealthy
        ? "All Redis clients healthy"
        : "Some Redis clients unhealthy",
      details: pingResults,
      timestamp: "2025-06-20 14:49:45",
    };
  } catch (error) {
    logger.error("❌ Redis health check failed at 2025-06-20 14:49:45:", error);
    return {
      healthy: false,
      message: `Health check failed: ${error.message}`,
      timestamp: "2025-06-20 14:49:45",
    };
  }
};

// Export connection status
export { isConnected };
