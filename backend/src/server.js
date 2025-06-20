import dotenv from 'dotenv';
import { createServer } from 'http';
import app from '../app.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeWebSocket } from './services/WebSocketService.js';
import { initializeAgents } from './agents/index.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    logger.info('🚀 Starting OmniDimension Multi-Agent System...');

    // Connect to databases
    await connectDatabase();
    logger.info('✅ MongoDB connected successfully');

    await connectRedis();
    logger.info('✅ Redis connected successfully');

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket
    initializeWebSocket(server);
    logger.info('✅ WebSocket initialized');

    // Initialize all agents
    await initializeAgents();
    logger.info('✅ All agents initialized successfully');

    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`🌟 Server running on http://${HOST}:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      logger.info('🤖 Multi-Agent System is ready for requests!');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        try {
          // Cleanup agents
          const { shutdownAgents } = await import('./agents/index.js');
          await shutdownAgents();
          
          // Close database connections
          const mongoose = await import('mongoose');
          await mongoose.disconnect();
          
          const { closeRedis } = await import('./config/redis.js');
          await closeRedis();
          
          logger.info('👋 Server shut down completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();