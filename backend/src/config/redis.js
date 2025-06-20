import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import crypto from "crypto"
let redisClient;
let redisSubscriber;
let redisPublisher;

const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    connectTimeout: 5000,
    lazyConnect: true
  },
  database: 0
};

export const connectRedis = async () => {
  try {
    // Main Redis client
    redisClient = createClient(REDIS_CONFIG);
    
    // Separate clients for pub/sub
    redisSubscriber = createClient(REDIS_CONFIG);
    redisPublisher = createClient(REDIS_CONFIG);

    // Error handlers
    redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
    redisSubscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));
    redisPublisher.on('error', (err) => logger.error('Redis Publisher Error:', err));

    // Connection handlers
    redisClient.on('connect', () => logger.info('Redis client connected'));
    redisClient.on('ready', () => logger.info('Redis client ready'));
    redisClient.on('end', () => logger.info('Redis client connection ended'));

    // Connect all clients
    await Promise.all([
      redisClient.connect(),
      redisSubscriber.connect(),
      redisPublisher.connect()
    ]);

    logger.info('All Redis clients connected successfully');

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client is not connected');
  }
  return redisClient;
};

export const getRedisSubscriber = () => {
  if (!redisSubscriber || !redisSubscriber.isOpen) {
    throw new Error('Redis subscriber is not connected');
  }
  return redisSubscriber;
};

export const getRedisPublisher = () => {
  if (!redisPublisher || !redisPublisher.isOpen) {
    throw new Error('Redis publisher is not connected');
  }
  return redisPublisher;
};

export const closeRedis = async () => {
  try {
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
    logger.info('All Redis connections closed successfully');
    
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
    throw error;
  }
};

// Pub/Sub helper functions
export const publishMessage = async (channel, message) => {
  try {
    const publisher = getRedisPublisher();
    const messageString = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });
    
    await publisher.publish(channel, messageString);
    logger.debug(`Published message to channel ${channel}`);
    
  } catch (error) {
    logger.error(`Error publishing to channel ${channel}:`, error);
    throw error;
  }
};

export const subscribeToChannel = async (channel, callback) => {
  try {
    const subscriber = getRedisSubscriber();
    
    await subscriber.subscribe(channel, (message, receivedChannel) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage, receivedChannel);
      } catch (error) {
        logger.error(`Error parsing message from channel ${receivedChannel}:`, error);
      }
    });
    
    logger.debug(`Subscribed to channel ${channel}`);
    
  } catch (error) {
    logger.error(`Error subscribing to channel ${channel}:`, error);
    throw error;
  }
};

export const unsubscribeFromChannel = async (channel) => {
  try {
    const subscriber = getRedisSubscriber();
    await subscriber.unsubscribe(channel);
    logger.debug(`Unsubscribed from channel ${channel}`);
    
  } catch (error) {
    logger.error(`Error unsubscribing from channel ${channel}:`, error);
    throw error;
  }
};