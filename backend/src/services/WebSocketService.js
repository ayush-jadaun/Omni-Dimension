import { WebSocketServer } from 'ws';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import { subscribeToChannel, publishMessage } from '../config/redis.js';
import SessionService from './SessionService.js';
import UserService from './UserService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

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
        path: '/ws',
        clientTracking: true
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.startHeartbeat();

      logger.info('WebSocket server initialized on /ws');

    } catch (error) {
      logger.error('WebSocket initialization failed:', error);
      throw error;
    }
  }

  async handleConnection(ws, request) {
    try {
      const { query } = parse(request.url, true);
      const sessionId = query.sessionId || this.extractSessionFromCookie(request.headers.cookie);

      if (!sessionId) {
        ws.close(1008, 'Session ID required');
        return;
      }

      // Validate session
      const sessionData = await SessionService.getSession(sessionId);
      if (!sessionData) {
        ws.close(1008, 'Invalid session');
        return;
      }

      // Get user data
      const user = await UserService.getUserById(sessionData.userId);
      if (!user) {
        ws.close(1008, 'User not found');
        return;
      }

      // Store connection
      const connectionId = uuidv4();
      ws.connectionId = connectionId;
      ws.sessionId = sessionId;
      ws.userId = sessionData.userId;
      ws.user = user;
      ws.isAlive = true;
      ws.lastActivity = new Date();

      this.clients.set(sessionId, ws);
      this.subscriptions.set(sessionId, new Set());

      // Subscribe to user-specific channels
      await this.subscribeUserToChannels(sessionId, sessionData.userId);

      // Send welcome message
      this.sendToClient(sessionId, {
        type: 'connection_established',
        message: `Welcome back, ${user.username}!`,
        connectionId,
        timestamp: new Date().toISOString(),
        serverTime: '2025-06-19 18:39:41'
      });

      // Handle incoming messages
      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.handleDisconnection(ws));
      ws.on('error', (error) => this.handleError(ws, error));
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = new Date();
      });

      // Update session activity
      await SessionService.updateSessionActivity(sessionId);

      logger.info('WebSocket connection established:', { 
        sessionId, 
        userId: sessionData.userId,
        username: user.username,
        connectionId
      });

    } catch (error) {
      logger.error('WebSocket connection handling failed:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  async handleMessage(ws, data) {
    try {
      ws.lastActivity = new Date();
      const message = JSON.parse(data.toString());

      logger.debug('WebSocket message received:', {
        sessionId: ws.sessionId,
        type: message.type,
        messageId: message.id
      });

      switch (message.type) {
        case 'ping':
          this.sendToClient(ws.sessionId, {
            type: 'pong',
            id: message.id,
            timestamp: new Date().toISOString()
          });
          break;

        case 'subscribe':
          await this.handleSubscription(ws, message);
          break;

        case 'unsubscribe':
          await this.handleUnsubscription(ws, message);
          break;

        case 'chat_message':
          await this.handleChatMessage(ws, message);
          break;

        case 'typing_start':
          await this.handleTypingIndicator(ws, message, true);
          break;

        case 'typing_stop':
          await this.handleTypingIndicator(ws, message, false);
          break;

        case 'status_update':
          await this.handleStatusUpdate(ws, message);
          break;

        default:
          this.sendToClient(ws.sessionId, {
            type: 'error',
            message: `Unknown message type: ${message.type}`,
            id: message.id,
            timestamp: new Date().toISOString()
          });
      }

      // Update session activity
      await SessionService.updateSessionActivity(ws.sessionId);

    } catch (error) {
      logger.error('WebSocket message handling failed:', error);
      this.sendToClient(ws.sessionId, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleSubscription(ws, message) {
    try {
      const { channels } = message;
      
      if (!Array.isArray(channels)) {
        throw new Error('Channels must be an array');
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
        type: 'subscription_confirmed',
        channels: Array.from(userSubscriptions),
        id: message.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Subscription handling failed:', error);
      this.sendToClient(ws.sessionId, {
        type: 'subscription_error',
        message: error.message,
        id: message.id,
        timestamp: new Date().toISOString()
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
        type: 'unsubscription_confirmed',
        channels: channels,
        id: message.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Unsubscription handling failed:', error);
    }
  }

  async handleChatMessage(ws, message) {
    try {
      // Forward to chat system via Redis
      await publishMessage('chat:incoming', {
        type: 'user_message',
        sessionId: ws.sessionId,
        userId: ws.userId,
        message: message.content,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        source: 'websocket'
      });

      // Send acknowledgment
      this.sendToClient(ws.sessionId, {
        type: 'message_received',
        id: message.id,
        status: 'processing',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Chat message handling failed:', error);
      this.sendToClient(ws.sessionId, {
        type: 'message_error',
        message: 'Failed to process chat message',
        id: message.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleTypingIndicator(ws, message, isTyping) {
    try {
      // Broadcast typing indicator to other participants
      await publishMessage(`session:${ws.sessionId}:typing`, {
        type: isTyping ? 'typing_start' : 'typing_stop',
        userId: ws.userId,
        username: ws.user.username,
        conversationId: message.conversationId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Typing indicator handling failed:', error);
    }
  }

  async handleStatusUpdate(ws, message) {
    try {
      const { status } = message;
      
      // Update user's online status
      await publishMessage('user:status', {
        type: 'status_update',
        userId: ws.userId,
        username: ws.user.username,
        status: status,
        timestamp: new Date().toISOString(),
        lastActivity: ws.lastActivity.toISOString()
      });

      this.sendToClient(ws.sessionId, {
        type: 'status_updated',
        status: status,
        id: message.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Status update handling failed:', error);
    }
  }

  handleDisconnection(ws) {
    try {
      logger.info('WebSocket disconnection:', {
        sessionId: ws.sessionId,
        userId: ws.userId,
        connectionId: ws.connectionId,
        duration: Date.now() - ws.lastActivity.getTime()
      });

      // Clean up
      this.clients.delete(ws.sessionId);
      this.subscriptions.delete(ws.sessionId);

      // Broadcast user offline status
      if (ws.userId) {
        publishMessage('user:status', {
          type: 'user_offline',
          userId: ws.userId,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('WebSocket disconnection handling failed:', error);
    }
  }

  handleError(ws, error) {
    logger.error('WebSocket error:', {
      sessionId: ws.sessionId,
      userId: ws.userId,
      error: error.message
    });
  }

  async subscribeUserToChannels(sessionId, userId) {
    try {
      const defaultChannels = [
        `session:${sessionId}`,
        `user:${userId}`,
        'system:announcements'
      ];

      const userSubscriptions = this.subscriptions.get(sessionId);
      
      for (const channel of defaultChannels) {
        userSubscriptions.add(channel);
        
        await subscribeToChannel(channel, (message) => {
          this.handleRedisMessage(sessionId, channel, message);
        });
      }

      logger.debug('User subscribed to default channels:', {
        sessionId,
        userId,
        channels: defaultChannels
      });

    } catch (error) {
      logger.error('Default channel subscription failed:', error);
    }
  }

  handleRedisMessage(sessionId, channel, message) {
    try {
      const ws = this.clients.get(sessionId);
      
      if (ws && ws.readyState === ws.OPEN) {
        this.sendToClient(sessionId, {
          type: 'redis_message',
          channel: channel,
          data: message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Redis message handling failed:', error);
    }
  }

  sendToClient(sessionId, data) {
    try {
      const ws = this.clients.get(sessionId);
      
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
        return true;
      }
      
      return false;

    } catch (error) {
      logger.error('Send to client failed:', error);
      return false;
    }
  }

  sendToUser(userId, data) {
    try {
      let sent = false;
      
      for (const [sessionId, ws] of this.clients) {
        if (ws.userId === userId && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(data));
          sent = true;
        }
      }
      
      return sent;

    } catch (error) {
      logger.error('Send to user failed:', error);
      return false;
    }
  }

  broadcast(data, filter = null) {
    try {
      let sentCount = 0;
      
      for (const [sessionId, ws] of this.clients) {
        if (ws.readyState === ws.OPEN) {
          if (!filter || filter(ws)) {
            ws.send(JSON.stringify(data));
            sentCount++;
          }
        }
      }
      
      return sentCount;

    } catch (error) {
      logger.error('Broadcast failed:', error);
      return 0;
    }
  }

  canUserAccessChannel(user, channel) {
    // Define channel access rules
    const publicChannels = [
      'system:announcements',
      'general:updates'
    ];

    const userChannels = [
      `user:${user.id}`,
      `session:${user.sessionId}`
    ];

    const adminChannels = [
      'admin:alerts',
      'system:monitoring'
    ];

    if (publicChannels.includes(channel)) return true;
    if (userChannels.some(uc => channel.startsWith(uc))) return true;
    if (adminChannels.includes(channel) && ['admin', 'super_admin'].includes(user.role)) return true;

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
          logger.warn('WebSocket connection terminated (no pong):', { sessionId });
          ws.terminate();
          this.clients.delete(sessionId);
          this.subscriptions.delete(sessionId);
          continue;
        }

        // Check for inactive connections (30 minutes)
        if (now - ws.lastActivity.getTime() > 30 * 60 * 1000) {
          logger.info('WebSocket connection terminated (inactive):', { sessionId });
          ws.terminate();
          this.clients.delete(sessionId);
          this.subscriptions.delete(sessionId);
          continue;
        }

        ws.isAlive = false;
        ws.ping();
      }
    }, 30000); // Every 30 seconds

    logger.info('WebSocket heartbeat started');
  }

  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      connectionsByUser: this.groupConnectionsByUser(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  groupConnectionsByUser() {
    const userConnections = {};
    
    for (const [sessionId, ws] of this.clients) {
      const userId = ws.userId;
      if (!userConnections[userId]) {
        userConnections[userId] = {
          username: ws.user.username,
          sessions: []
        };
      }
      
      userConnections[userId].sessions.push({
        sessionId,
        connectionId: ws.connectionId,
        connectedAt: ws.lastActivity,
        isAlive: ws.isAlive
      });
    }
    
    return userConnections;
  }

  shutdown() {
    try {
      logger.info('Shutting down WebSocket service');

      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all connections
      for (const [sessionId, ws] of this.clients) {
        ws.close(1001, 'Server shutting down');
      }

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Clear maps
      this.clients.clear();
      this.subscriptions.clear();

      logger.info('WebSocket service shutdown complete');

    } catch (error) {
      logger.error('WebSocket shutdown error:', error);
    }
  }
}

export default new WebSocketService();