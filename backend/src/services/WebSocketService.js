/**
 * WebSocket Service - Fixed ObjectId Handling
 * Current Time: 2025-06-20 09:55:18 UTC
 * Current User: ayush20244048
 */

import { WebSocketServer } from "ws";
import { parse } from "url";
import jwt from "jsonwebtoken";
import { subscribeToChannel, publishMessage } from "../config/redis.js";
import SessionService from "./SessionService.js";
import UserService from "./UserService.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // sessionId -> WebSocket
    this.subscriptions = new Map(); // sessionId -> Set of channels
    this.heartbeatInterval = null;
  }

  initialize(server) {
    try {
      this.wss = new WebSocketServer({
        server,
        path: "/ws",
        clientTracking: true,
      });

      this.wss.on("connection", this.handleConnection.bind(this));
      this.startHeartbeat();

      logger.info("WebSocket server initialized on /ws at 2025-06-20 09:55:18");
    } catch (error) {
      logger.error(
        "WebSocket initialization failed at 2025-06-20 09:55:18:",
        error
      );
      throw error;
    }
  }

  async handleConnection(ws, request) {
    try {
      logger.info("🔌 New WebSocket connection attempt at 2025-06-20 09:55:18");

      const { query } = parse(request.url, true);
      const sessionId =
        query.sessionId ||
        this.extractSessionFromCookie(request.headers.cookie);

      logger.info("🔑 Session ID extracted:", {
        fromQuery: !!query.sessionId,
        fromCookie: !!this.extractSessionFromCookie(request.headers.cookie),
        sessionId: sessionId ? sessionId.substring(0, 10) + "..." : "None",
      });

      if (!sessionId) {
        logger.warn(
          "❌ WebSocket rejected: No session ID at 2025-06-20 09:55:18"
        );
        ws.close(1008, "Session ID required");
        return;
      }

      // Validate session
      logger.info("📋 Validating session...");
      const sessionData = await SessionService.getSession(sessionId);

      if (!sessionData) {
        logger.warn(
          "❌ WebSocket rejected: Invalid session at 2025-06-20 09:55:18:",
          sessionId.substring(0, 10) + "..."
        );
        ws.close(1008, "Invalid session");
        return;
      }

      logger.info("✅ Session validated:", {
        userId: sessionData.userId,
        expiresAt: sessionData.expiresAt,
      });

      // Extract proper userId - handle different formats
      let userId;
      if (typeof sessionData.userId === "string") {
        // If it's already a string ObjectId
        if (mongoose.Types.ObjectId.isValid(sessionData.userId)) {
          userId = sessionData.userId;
        } else {
          // If it's a stringified object, try to extract _id
          try {
            const userObj = JSON.parse(sessionData.userId);
            userId = userObj._id || userObj.id;
          } catch (parseError) {
            logger.error(
              "❌ Failed to parse userId from session at 2025-06-20 09:55:18:",
              sessionData.userId
            );
            ws.close(1008, "Invalid user data in session");
            return;
          }
        }
      } else if (typeof sessionData.userId === "object") {
        // If it's an object with _id
        userId =
          sessionData.userId._id || sessionData.userId.id || sessionData.userId;
      } else {
        userId = sessionData.userId;
      }

      // Ensure userId is a valid ObjectId string
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error("❌ Invalid ObjectId format at 2025-06-20 09:55:18:", {
          originalUserId: sessionData.userId,
          extractedUserId: userId,
          type: typeof userId,
        });
        ws.close(1008, "Invalid user ID format");
        return;
      }

      logger.info("🔍 Getting user data for userId:", userId);

      // Get user data with proper ObjectId
      const user = await UserService.getUserById(userId);
      if (!user) {
        logger.warn(
          "❌ WebSocket rejected: User not found at 2025-06-20 09:55:18:",
          userId
        );
        ws.close(1008, "User not found");
        return;
      }

      logger.info("✅ User found:", {
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });

      // Check if user is active
      if (!user.isActive) {
        logger.warn(
          "❌ WebSocket rejected: User inactive at 2025-06-20 09:55:18:",
          user.username
        );
        ws.close(1008, "User account is inactive");
        return;
      }

      // Store connection
      const connectionId = uuidv4();
      ws.connectionId = connectionId;
      ws.sessionId = sessionId;
      ws.userId = userId; // Store as string ObjectId
      ws.user = user;
      ws.isAlive = true;
      ws.lastActivity = new Date();

      this.clients.set(sessionId, ws);
      this.subscriptions.set(sessionId, new Set());

      // Subscribe to user-specific channels
      await this.subscribeUserToChannels(sessionId, userId);

      // Send welcome message
      this.sendToClient(sessionId, {
        type: "connection_established",
        message: `Welcome back, ${user.username}!`,
        connectionId,
        userId: userId,
        username: user.username,
        role: user.role,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
        currentUser: "ayush20244048",
      });

      // Handle incoming messages
      ws.on("message", (data) => this.handleMessage(ws, data));
      ws.on("close", () => this.handleDisconnection(ws));
      ws.on("error", (error) => this.handleError(ws, error));
      ws.on("pong", () => {
        ws.isAlive = true;
        ws.lastActivity = new Date();
      });

      // Update session activity
      await SessionService.updateSessionActivity(sessionId);

      logger.info(
        "✅ WebSocket connection established at 2025-06-20 09:55:18:",
        {
          sessionId: sessionId.substring(0, 10) + "...",
          userId: userId,
          username: user.username,
          connectionId,
          currentUser: "ayush20244048",
        }
      );
    } catch (error) {
      logger.error(
        "❌ WebSocket connection handling failed at 2025-06-20 09:55:18:",
        {
          error: error.message,
          stack: error.stack,
          currentUser: "ayush20244048",
        }
      );
      ws.close(1011, "Internal server error");
    }
  }

  async handleMessage(ws, data) {
    try {
      ws.lastActivity = new Date();
      const message = JSON.parse(data.toString());

      logger.debug("📥 WebSocket message received at 2025-06-20 09:55:18:", {
        sessionId: ws.sessionId
          ? ws.sessionId.substring(0, 10) + "..."
          : "Unknown",
        type: message.type,
        messageId: message.id,
        username: ws.user?.username,
        currentUser: "ayush20244048",
      });

      switch (message.type) {
        case "ping":
          this.sendToClient(ws.sessionId, {
            type: "pong",
            id: message.id,
            timestamp: new Date().toISOString(),
            serverTime: "2025-06-20 09:55:18",
            currentUser: "ayush20244048",
          });
          break;

        case "subscribe":
          await this.handleSubscription(ws, message);
          break;

        case "unsubscribe":
          await this.handleUnsubscription(ws, message);
          break;

        case "chat_message":
          await this.handleChatMessage(ws, message);
          break;

        case "typing_start":
          await this.handleTypingIndicator(ws, message, true);
          break;

        case "typing_stop":
          await this.handleTypingIndicator(ws, message, false);
          break;

        case "status_update":
          await this.handleStatusUpdate(ws, message);
          break;

        default:
          this.sendToClient(ws.sessionId, {
            type: "error",
            message: `Unknown message type: ${message.type}`,
            id: message.id,
            timestamp: new Date().toISOString(),
            serverTime: "2025-06-20 09:55:18",
          });
      }

      // Update session activity
      await SessionService.updateSessionActivity(ws.sessionId);
    } catch (error) {
      logger.error(
        "❌ WebSocket message handling failed at 2025-06-20 09:55:18:",
        error
      );
      this.sendToClient(ws.sessionId, {
        type: "error",
        message: "Invalid message format",
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    }
  }

  async handleSubscription(ws, message) {
    try {
      const { channels } = message;

      if (!Array.isArray(channels)) {
        throw new Error("Channels must be an array");
      }

      const userSubscriptions = this.subscriptions.get(ws.sessionId);

      for (const channel of channels) {
        // Validate channel access
        if (this.canUserAccessChannel(ws.user, channel)) {
          userSubscriptions.add(channel);

          // Subscribe to Redis channel
          await subscribeToChannel(channel, (redisMessage) => {
            this.handleRedisMessage(ws.sessionId, channel, redisMessage);
          });
        }
      }

      this.sendToClient(ws.sessionId, {
        type: "subscription_confirmed",
        channels: Array.from(userSubscriptions),
        id: message.id,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    } catch (error) {
      logger.error(
        "❌ Subscription handling failed at 2025-06-20 09:55:18:",
        error
      );
      this.sendToClient(ws.sessionId, {
        type: "subscription_error",
        message: error.message,
        id: message.id,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    }
  }

  async handleUnsubscription(ws, message) {
    try {
      const { channels } = message;
      const userSubscriptions = this.subscriptions.get(ws.sessionId);

      for (const channel of channels) {
        userSubscriptions.delete(channel);
      }

      this.sendToClient(ws.sessionId, {
        type: "unsubscription_confirmed",
        channels: channels,
        id: message.id,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    } catch (error) {
      logger.error(
        "❌ Unsubscription handling failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  async handleChatMessage(ws, message) {
    try {
      logger.info("💬 Processing chat message at 2025-06-20 09:55:18:", {
        userId: ws.userId,
        username: ws.user?.username,
        messageId: message.id,
        contentLength: message.content?.length,
      });

      // Forward to chat system via Redis
      await publishMessage("chat:incoming", {
        type: "user_message",
        sessionId: ws.sessionId,
        userId: ws.userId,
        username: ws.user?.username,
        message: message.content,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        source: "websocket",
        currentUser: "ayush20244048",
      });

      // Send acknowledgment
      this.sendToClient(ws.sessionId, {
        type: "message_received",
        id: message.id,
        status: "processing",
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });

      // Send a test response after 1 second
      setTimeout(() => {
        this.sendToClient(ws.sessionId, {
          type: "message_response",
          id: message.id,
          content: `Hello ${ws.user?.username}! I received your message: "${message.content}". This is a test response from the WebSocket service.`,
          agent: "websocket-service",
          confidence: 0.95,
          timestamp: new Date().toISOString(),
          serverTime: "2025-06-20 09:55:18",
          messageId: `response-${Date.now()}`,
        });
      }, 1000);
    } catch (error) {
      logger.error(
        "❌ Chat message handling failed at 2025-06-20 09:55:18:",
        error
      );
      this.sendToClient(ws.sessionId, {
        type: "message_error",
        message: "Failed to process chat message",
        id: message.id,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    }
  }

  async handleTypingIndicator(ws, message, isTyping) {
    try {
      // Broadcast typing indicator to other participants
      await publishMessage(`session:${ws.sessionId}:typing`, {
        type: isTyping ? "typing_start" : "typing_stop",
        userId: ws.userId,
        username: ws.user.username,
        conversationId: message.conversationId,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    } catch (error) {
      logger.error(
        "❌ Typing indicator handling failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  async handleStatusUpdate(ws, message) {
    try {
      const { status } = message;

      // Update user's online status
      await publishMessage("user:status", {
        type: "status_update",
        userId: ws.userId,
        username: ws.user.username,
        status: status,
        timestamp: new Date().toISOString(),
        lastActivity: ws.lastActivity.toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });

      this.sendToClient(ws.sessionId, {
        type: "status_updated",
        status: status,
        id: message.id,
        timestamp: new Date().toISOString(),
        serverTime: "2025-06-20 09:55:18",
      });
    } catch (error) {
      logger.error(
        "❌ Status update handling failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  handleDisconnection(ws) {
    try {
      logger.info("🔌 WebSocket disconnection at 2025-06-20 09:55:18:", {
        sessionId: ws.sessionId
          ? ws.sessionId.substring(0, 10) + "..."
          : "Unknown",
        userId: ws.userId,
        username: ws.user?.username,
        connectionId: ws.connectionId,
        duration: ws.lastActivity
          ? Date.now() - ws.lastActivity.getTime()
          : "Unknown",
        currentUser: "ayush20244048",
      });

      // Clean up
      this.clients.delete(ws.sessionId);
      this.subscriptions.delete(ws.sessionId);

      // Broadcast user offline status
      if (ws.userId) {
        publishMessage("user:status", {
          type: "user_offline",
          userId: ws.userId,
          username: ws.user?.username,
          timestamp: new Date().toISOString(),
          serverTime: "2025-06-20 09:55:18",
        });
      }
    } catch (error) {
      logger.error(
        "❌ WebSocket disconnection handling failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  handleError(ws, error) {
    logger.error("❌ WebSocket error at 2025-06-20 09:55:18:", {
      sessionId: ws.sessionId
        ? ws.sessionId.substring(0, 10) + "..."
        : "Unknown",
      userId: ws.userId,
      username: ws.user?.username,
      error: error.message,
      currentUser: "ayush20244048",
    });
  }

  async subscribeUserToChannels(sessionId, userId) {
    try {
      const defaultChannels = [
        `session:${sessionId}`,
        `user:${userId}`,
        "system:announcements",
      ];

      const userSubscriptions = this.subscriptions.get(sessionId);

      for (const channel of defaultChannels) {
        userSubscriptions.add(channel);

        await subscribeToChannel(channel, (message) => {
          this.handleRedisMessage(sessionId, channel, message);
        });
      }

      logger.debug(
        "✅ User subscribed to default channels at 2025-06-20 09:55:18:",
        {
          sessionId: sessionId.substring(0, 10) + "...",
          userId,
          channels: defaultChannels,
          currentUser: "ayush20244048",
        }
      );
    } catch (error) {
      logger.error(
        "❌ Default channel subscription failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  handleRedisMessage(sessionId, channel, message) {
    try {
      const ws = this.clients.get(sessionId);

      if (ws && ws.readyState === ws.OPEN) {
        this.sendToClient(sessionId, {
          type: "redis_message",
          channel: channel,
          data: message,
          timestamp: new Date().toISOString(),
          serverTime: "2025-06-20 09:55:18",
        });
      }
    } catch (error) {
      logger.error(
        "❌ Redis message handling failed at 2025-06-20 09:55:18:",
        error
      );
    }
  }

  sendToClient(sessionId, data) {
    try {
      const ws = this.clients.get(sessionId);

      if (ws && ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            ...data,
            serverTime: "2025-06-20 09:55:18",
            currentUser: "ayush20244048",
          })
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error("❌ Send to client failed at 2025-06-20 09:55:18:", error);
      return false;
    }
  }

  sendToUser(userId, data) {
    try {
      let sent = false;

      for (const [sessionId, ws] of this.clients) {
        if (ws.userId === userId && ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              ...data,
              serverTime: "2025-06-20 09:55:18",
              currentUser: "ayush20244048",
            })
          );
          sent = true;
        }
      }

      return sent;
    } catch (error) {
      logger.error("❌ Send to user failed at 2025-06-20 09:55:18:", error);
      return false;
    }
  }

  broadcast(data, filter = null) {
    try {
      let sentCount = 0;

      for (const [sessionId, ws] of this.clients) {
        if (ws.readyState === ws.OPEN) {
          if (!filter || filter(ws)) {
            ws.send(
              JSON.stringify({
                ...data,
                serverTime: "2025-06-20 09:55:18",
                currentUser: "ayush20244048",
              })
            );
            sentCount++;
          }
        }
      }

      return sentCount;
    } catch (error) {
      logger.error("❌ Broadcast failed at 2025-06-20 09:55:18:", error);
      return 0;
    }
  }

  canUserAccessChannel(user, channel) {
    // Define channel access rules
    const publicChannels = ["system:announcements", "general:updates"];

    const userChannels = [
      `user:${user._id || user.id}`,
      `session:${user.sessionId}`,
    ];

    const adminChannels = ["admin:alerts", "system:monitoring"];

    if (publicChannels.includes(channel)) return true;
    if (userChannels.some((uc) => channel.startsWith(uc.split(":")[0])))
      return true;
    if (
      adminChannels.includes(channel) &&
      ["admin", "super_admin"].includes(user.role)
    )
      return true;

    return false;
  }

  extractSessionFromCookie(cookieHeader) {
    if (!cookieHeader) return null;

    const match = cookieHeader.match(/sessionId=([^;]+)/);
    return match ? match[1] : null;
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [sessionId, ws] of this.clients) {
        if (ws.isAlive === false) {
          logger.warn(
            "⚠️ WebSocket connection terminated (no pong) at 2025-06-20 09:55:18:",
            {
              sessionId: sessionId.substring(0, 10) + "...",
              username: ws.user?.username,
            }
          );
          ws.terminate();
          this.clients.delete(sessionId);
          this.subscriptions.delete(sessionId);
          continue;
        }

        // Check for inactive connections (30 minutes)
        if (now - ws.lastActivity.getTime() > 30 * 60 * 1000) {
          logger.info(
            "⚠️ WebSocket connection terminated (inactive) at 2025-06-20 09:55:18:",
            {
              sessionId: sessionId.substring(0, 10) + "...",
              username: ws.user?.username,
            }
          );
          ws.terminate();
          this.clients.delete(sessionId);
          this.subscriptions.delete(sessionId);
          continue;
        }

        ws.isAlive = false;
        ws.ping();
      }
    }, 30000); // Every 30 seconds

    logger.info("✅ WebSocket heartbeat started at 2025-06-20 09:55:18");
  }

  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      connectionsByUser: this.groupConnectionsByUser(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      serverTime: "2025-06-20 09:55:18",
      currentUser: "ayush20244048",
    };
  }

  groupConnectionsByUser() {
    const userConnections = {};

    for (const [sessionId, ws] of this.clients) {
      const userId = ws.userId;
      if (!userConnections[userId]) {
        userConnections[userId] = {
          username: ws.user?.username,
          sessions: [],
        };
      }

      userConnections[userId].sessions.push({
        sessionId: sessionId.substring(0, 10) + "...",
        connectionId: ws.connectionId,
        connectedAt: ws.lastActivity,
        isAlive: ws.isAlive,
      });
    }

    return userConnections;
  }

  shutdown() {
    try {
      logger.info("📴 Shutting down WebSocket service at 2025-06-20 09:55:18");

      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all connections
      for (const [sessionId, ws] of this.clients) {
        ws.close(1001, "Server shutting down");
      }

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Clear maps
      this.clients.clear();
      this.subscriptions.clear();

      logger.info(
        "✅ WebSocket service shutdown complete at 2025-06-20 09:55:18"
      );
    } catch (error) {
      logger.error(
        "❌ WebSocket shutdown error at 2025-06-20 09:55:18:",
        error
      );
    }
  }
}

export default new WebSocketService();
