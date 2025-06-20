/**
 * Database Configuration and Connection Management
 * Current Time: 2025-06-20 05:32:28 UTC
 * Current User: ayush20244048
 */

import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

// MongoDB Connection Configuration
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Updated from maxConnections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  // Removed deprecated options:
  // - bufferMaxEntries (deprecated)
  // - useCreateIndex (deprecated)
  // - useFindAndModify (deprecated)
};

// Get MongoDB URI from environment
const getMongoURI = () => {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    "mongodb://localhost:27017/omnidimension";

  logger.system("MongoDB", "config", "Database URI configured", {
    uri: uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"), // Hide credentials in logs
    timestamp: "2025-06-20 05:32:28",
    currentUser: "ayush20244048",
  });

  return uri;
};

// Connect to MongoDB
export const connectDB = async () => {
  try {
    const mongoURI = getMongoURI();

    logger.system(
      "MongoDB",
      "connecting",
      "Establishing database connection...",
      {
        timestamp: "2025-06-20 05:32:28",
        currentUser: "ayush20244048",
      }
    );

    const conn = await mongoose.connect(mongoURI, mongoConfig);

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      logger.system("MongoDB", "connected", "Database connection established", {
        host: conn.connection.host,
        port: conn.connection.port,
        name: conn.connection.name,
        timestamp: "2025-06-20 05:32:28",
        currentUser: "ayush20244048",
      });
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err, {
        timestamp: "2025-06-20 05:32:28",
        currentUser: "ayush20244048",
      });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected", {
        timestamp: "2025-06-20 05:32:28",
        currentUser: "ayush20244048",
      });
    });

    // Graceful close on process termination
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        logger.system(
          "MongoDB",
          "disconnected",
          "Database connection closed through app termination",
          {
            timestamp: "2025-06-20 05:32:28",
            currentUser: "ayush20244048",
          }
        );
        process.exit(0);
      } catch (error) {
        logger.error("Error closing MongoDB connection:", error);
        process.exit(1);
      }
    });

    logger.system("MongoDB", "ready", "Database connection successful", {
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections).length,
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    });

    return conn;
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error, {
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    });

    // Exit process with failure
    process.exit(1);
  }
};

// Disconnect from MongoDB
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.system("MongoDB", "disconnected", "Database connection closed", {
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    });
  } catch (error) {
    logger.error("Error disconnecting from MongoDB:", error, {
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    });
  }
};

// Get connection status
export const getConnectionStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    state: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    collections: Object.keys(mongoose.connection.collections),
    timestamp: "2025-06-20 05:32:28",
    currentUser: "ayush20244048",
  };
};

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        status: "unhealthy",
        message: "Database not connected",
        readyState: mongoose.connection.readyState,
        timestamp: "2025-06-20 05:32:28",
      };
    }

    // Simple ping to verify connection
    await mongoose.connection.db.admin().ping();

    return {
      status: "healthy",
      message: "Database connection is active",
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    };
  } catch (error) {
    logger.error("Database health check failed:", error);
    return {
      status: "unhealthy",
      message: error.message,
      error: error.name,
      timestamp: "2025-06-20 05:32:28",
    };
  }
};

// Database cleanup and optimization
export const optimizeDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database not connected");
    }

    // Get database statistics
    const stats = await mongoose.connection.db.stats();

    logger.system("MongoDB", "optimization", "Database statistics collected", {
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      totalSize: stats.totalSize,
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    });

    return {
      status: "completed",
      stats,
      timestamp: "2025-06-20 05:32:28",
      currentUser: "ayush20244048",
    };
  } catch (error) {
    logger.error("Database optimization failed:", error);
    throw error;
  }
};

// Export default connection function
export default connectDB;
