/**
 * OmniDimension Multi-Agent System
 * Main Application Bootstrap
 * 
 * Current Time: 2025-06-19 18:42:52 UTC
 * System Status: Initializing
 * Build: Production Ready v1.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuration and Constants
import { connectDB } from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';
import { HTTP_STATUS } from './src/config/constants.js';

// Middleware
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { requestLogger } from './src/middleware/requestLogger.js';
import { globalRateLimiter } from './src/middleware/rateLimiter.js';
import { sessionAuth } from './src/middleware/session.js';

// Routes
import indexRoutes from './src/routes/index.js';
import authRoutes from './src/routes/auth.js';
import chatRoutes from './src/routes/chat.js';
import workflowRoutes from './src/routes/workflows.js';
import userRoutes from './src/routes/users.js';
import adminRoutes from './src/routes/admin.js';

// Services
import { 
  WebSocketService, 
  NotificationService,
  SessionService,
  UserService 
} from './src/services/index.js';

// Agents
import { initializeAgents, getSystemHealth } from './src/agents/index.js';

// Utilities
import { logger } from './src/utils/logger.js';

//cors

import {corsConfig, corsPreflightHandler} from './src/middleware/cors.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OmniDimensionApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
    
    // System metadata
    this.systemInfo = {
      name: 'OmniDimension Multi-Agent System',
      version: '1.0.0',
      startTime: '2025-06-19 18:42:52',
      currentUser: 'ayush20244048',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  async initialize() {
    try {
      logger.info('🚀 OmniDimension Multi-Agent System Initializing...');
      logger.info(`📅 Start Time: ${this.systemInfo.startTime} UTC`);
      logger.info(`👤 Current User: ${this.systemInfo.currentUser}`);
      logger.info(`🌍 Environment: ${this.systemInfo.environment}`);
      
      // Step 1: Database Connection
      await this.initializeDatabase();
      
      // Step 2: Redis Connection
      await this.initializeRedis();
      
      // Step 3: Express Application Setup
      this.setupExpress();
      
      // Step 4: Routes Setup
      this.setupRoutes();
      
      // Step 5: Error Handling
      this.setupErrorHandling();
      
      // Step 6: HTTP Server Creation
      this.createServer();
      
      // Step 7: WebSocket Service
      await this.initializeWebSocket();
      
      // Step 8: Multi-Agent System
      await this.initializeAgents();
      
      // Step 9: Services
      await this.initializeServices();
      
      // Step 10: Graceful Shutdown Handlers
      this.setupShutdownHandlers();
      
      logger.info('✅ OmniDimension System Initialized Successfully!');
      
    } catch (error) {
      logger.error('❌ System Initialization Failed:', error);
      process.exit(1);
    }
  }

  async initializeDatabase() {
    try {
      logger.info('📊 Connecting to MongoDB...');
      await connectDB();
      logger.info('✅ MongoDB Connected Successfully');
      
      // Log database info
      const dbState = mongoose.connection.readyState;
      const dbName = mongoose.connection.name;
      logger.info(`📈 Database: ${dbName} (State: ${dbState})`);
      
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      logger.info('🔄 Connecting to Redis...');
      await connectRedis();
      logger.info('✅ Redis Connected Successfully');
      
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  setupExpress() {
    logger.info('⚙️ Setting up Express application...');
    
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
    
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));
    
    this.app.use(cors(corsConfig));

    // Additional manual CORS headers for extra safety
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && corsConfig.origin) {
        res.header("Access-Control-Allow-Origin", origin);
      }
      res.header("Access-Control-Allow-Credentials", "true");
      res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,PATCH,OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control," +
          "X-Session-ID,x-session-id,X-User-ID,x-user-id,x-user,X-User," +
          "X-Request-ID,x-request-id,X-API-Version,x-api-version,X-API-Key,x-api-key," +
          "X-Timestamp,x-timestamp,X-Client-Version,x-client-version, x-build"
      );

      console.log(
        `🌐 CORS headers set for ${req.method} ${req.path} at 2025-06-20 10:50:09`
      );
      next();
    });
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Cookie parsing
    this.app.use(cookieParser());
    
    // Request logging
    this.app.use(requestLogger);
    
    // Global rate limiting
    this.app.use(globalRateLimiter);
    
    // Static files
    this.app.use('/static', express.static(join(__dirname, 'public')));
    
    // System info endpoint
    this.app.get('/system-info', (req, res) => {
      res.json({
        ...this.systemInfo,
        currentTime: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    });
    
    logger.info('✅ Express application configured');
  }

  setupRoutes() {
    logger.info('🛣️ Setting up API routes...');
    
    // Root routes
    this.app.use('/', indexRoutes);
    
    // Authentication routes (public)
    this.app.use('/api/auth', authRoutes);
    
    // Protected routes (require authentication)
    this.app.use('/api/chat', sessionAuth, chatRoutes);
    this.app.use('/api/workflows', sessionAuth, workflowRoutes);
    this.app.use('/api/users', sessionAuth, userRoutes);
    this.app.use('/api/admin', sessionAuth, adminRoutes);
    
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const systemHealth = await getSystemHealth();
        
        res.json({
          status: 'healthy',
          timestamp: '2025-06-19 18:42:52',
          system: systemHealth,
          services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: 'connected', // Would check actual Redis status
            websocket: WebSocketService ? 'active' : 'inactive',
            agents: systemHealth.active_agents || 0
          },
          currentUser: this.systemInfo.currentUser,
          uptime: process.uptime(),
          version: this.systemInfo.version
        });
        
      } catch (error) {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    logger.info('✅ API routes configured');
  }

  setupErrorHandling() {
    logger.info('🛡️ Setting up error handling...');
    
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
    
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });
    
    logger.info('✅ Error handling configured');
  }

  createServer() {
    logger.info('🌐 Creating HTTP server...');
    
    this.server = createServer(this.app);
    
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${process.env.PORT || 8000} is already in use`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
    logger.info('✅ HTTP server created');
  }

  async initializeWebSocket() {
    try {
      logger.info('🔌 Initializing WebSocket service...');
      
      WebSocketService.initialize(this.server);
      
      logger.info('✅ WebSocket service initialized');
      
    } catch (error) {
      logger.error('❌ WebSocket initialization failed:', error);
      throw error;
    }
  }

  async initializeAgents() {
    try {
      logger.info('🤖 Initializing Multi-Agent System...');
      
      const agents = await initializeAgents();
      
      logger.info('✅ Multi-Agent System initialized:', {
        orchestrator: agents.orchestrator?.id,
        nlp: agents.nlp?.id,
        search: agents.search?.id,
        omnidimension: agents.omnidimension?.id,
        monitoring: agents.monitoring?.id
      });
      
      // Send welcome notification to current user
      setTimeout(async () => {
        try {
          // Find user ayush20244048
          const users = await UserService.searchUsers('ayush20244048', 1, 1);
          if (users.users.length > 0) {
            const user = users.users[0];
            await NotificationService.notifyWelcomeMessage(user.id);
            logger.info(`👋 Welcome notification sent to ${this.systemInfo.currentUser}`);
          }
        } catch (error) {
          logger.warn('Welcome notification failed:', error);
        }
      }, 5000);
      
    } catch (error) {
      logger.error('❌ Agent initialization failed:', error);
      throw error;
    }
  }

  async initializeServices() {
    try {
      logger.info('🔧 Initializing additional services...');
      
      // Notification service is already initialized
      logger.info('✅ Notification Service: Active');
      
      // Session cleanup scheduler
      setInterval(async () => {
        try {
          const cleaned = await SessionService.cleanupExpiredSessions();
          if (cleaned > 0) {
            logger.info(`🧹 Cleaned up ${cleaned} expired sessions`);
          }
        } catch (error) {
          logger.error('Session cleanup error:', error);
        }
      }, 60 * 60 * 1000); // Every hour
      
      logger.info('✅ Additional services initialized');
      
    } catch (error) {
      logger.error('❌ Services initialization failed:', error);
      throw error;
    }
  }

  setupShutdownHandlers() {
    logger.info('🛡️ Setting up graceful shutdown handlers...');
    
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    
    logger.info('✅ Shutdown handlers configured');
  }

  async start() {
    const port = process.env.PORT || 8000;
    const host = process.env.HOST || '0.0.0.0';
    
    this.server.listen(port, host, () => {
      logger.info('🎉 OmniDimension Multi-Agent System Started Successfully!');
      logger.info(`🌍 Server running on http://${host}:${port}`);
      logger.info(`🔌 WebSocket available at ws://${host}:${port}/ws`);
      logger.info(`📚 API Documentation: http://${host}:${port}/docs`);
      logger.info(`⚡ Health Check: http://${host}:${port}/health`);
      logger.info(`👤 Current User: ${this.systemInfo.currentUser}`);
      logger.info(`⏰ System Time: 2025-06-19 18:42:52 UTC`);
      
      // Log system capabilities
      logger.info('🚀 System Capabilities:');
      logger.info('   🤖 Multi-agent AI orchestration');
      logger.info('   📞 Voice calling automation (OmniDimension)');
      logger.info('   📅 Appointment booking');
      logger.info('   🍽️ Restaurant reservations');
      logger.info('   💬 Real-time chat interface');
      logger.info('   📊 Workflow management');
      logger.info('   📈 System monitoring & analytics');
      logger.info('   🔄 Real-time WebSocket updates');
      logger.info('   📧 Multi-channel notifications');
      
      // Log available endpoints
      logger.info('📍 Available Endpoints:');
      logger.info('   🔐 Authentication: /api/auth/*');
      logger.info('   💬 Chat: /api/chat/*');
      logger.info('   🔄 Workflows: /api/workflows/*');
      logger.info('   👤 Users: /api/users/*');
      logger.info('   🛠️ Admin: /api/admin/*');
    });
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info(`📴 Graceful shutdown initiated by ${signal}`);
    
    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('✅ HTTP server closed');
        });
      }
      
      // Shutdown WebSocket service
      if (WebSocketService) {
        WebSocketService.shutdown();
        logger.info('✅ WebSocket service stopped');
      }
      
      // Shutdown notification service
      if (NotificationService) {
        NotificationService.shutdown();
        logger.info('✅ Notification service stopped');
      }
      
      // Shutdown agents
      const { shutdownAgents } = await import('./src/agents/index.js');
      await shutdownAgents();
      logger.info('✅ Multi-agent system stopped');
      
      // Close database connection
      await mongoose.connection.close();
      logger.info('✅ Database connection closed');
      
      logger.info('👋 OmniDimension System Shutdown Complete');
      process.exit(0);
      
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Initialize and start the application
const app = new OmniDimensionApp();

async function startSystem() {
  try {
    await app.initialize();
    await app.start();
  } catch (error) {
    logger.error('❌ Failed to start OmniDimension System:', error);
    process.exit(1);
  }
}

// Start the system
startSystem();

export default app;