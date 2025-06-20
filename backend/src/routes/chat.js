import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Workflow } from '../models/index.js';
import { chatRateLimiter } from '../middleware/rateLimiter.js';
import { validateChatMessage, validateMessageUpdate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, MESSAGE_TYPES } from '../config/constants.js';
import { getAgent } from '../agents/index.js';
import { publishMessage } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/chat/message
// @desc    Send a message and get AI response
// @access  Private
router.post('/message', chatRateLimiter, validateChatMessage, asyncHandler(async (req, res) => {
  const { message, context = {} } = req.body;
  const { sessionId, userId } = req.session;

  logger.info('Chat message received:', { 
    userId, 
    sessionId, 
    messageLength: message.length 
  });

  // Get or create conversation
  let conversation = await Conversation.findActiveConversation(sessionId);
  
  if (!conversation) {
    conversation = new Conversation({
      sessionId,
      userId,
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      messages: [],
      context: context,
      isActive: true
    });
  }

  // Add user message
  const userMessageId = uuidv4();
  await conversation.addMessage({
    id: userMessageId,
    role: MESSAGE_TYPES.USER,
    content: message,
    metadata: {
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // Send real-time update to user
  await publishMessage(`session:${sessionId}`, {
    type: 'message_received',
    messageId: userMessageId,
    content: message,
    timestamp: new Date().toISOString()
  });

  // Get orchestrator agent
  const orchestrator = getAgent('orchestrator');
  
  if (!orchestrator || !orchestrator.isAvailable()) {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      error: 'AI service temporarily unavailable',
      message: 'Please try again in a moment',
      code: 'SERVICE_UNAVAILABLE'
    });
  }

  try {
    // Send processing indicator
    await publishMessage(`session:${sessionId}`, {
      type: 'processing_started',
      message: 'Processing your request...',
      timestamp: new Date().toISOString()
    });

    // Create task for orchestrator
    const taskId = `chat_${uuidv4()}`;
    
    // Send task to orchestrator via Redis
    await publishMessage('agent:orchestrator', {
      type: 'task_assignment',
      taskId: taskId,
      taskData: {
        action: 'process_user_request',
        userMessage: message,
        sessionId: sessionId,
        userId: userId,
        context: {
          ...context,
          conversationHistory: conversation.messages.slice(-5), // Last 5 messages for context
          userProfile: req.user.profile
        }
      },
      workflowId: `chat_workflow_${Date.now()}`,
      sessionId: sessionId,
      priority: 7,
      from: 'chat_api'
    });

    // Return immediate response
    res.json({
      success: true,
      message: 'Message received and being processed',
      messageId: userMessageId,
      conversationId: conversation._id,
      taskId: taskId,
      status: 'processing'
    });

    // The actual AI response will be sent via WebSocket when the orchestrator completes
    // This allows for real-time streaming responses

  } catch (error) {
    logger.error('Error processing chat message:', error);
    
    // Add error message to conversation
    await conversation.addMessage({
      id: uuidv4(),
      role: MESSAGE_TYPES.SYSTEM,
      content: 'I apologize, but I encountered an error processing your message. Please try again.',
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Processing failed',
      message: 'Failed to process your message. Please try again.',
      code: 'PROCESSING_FAILED'
    });
  }
}));

// @route   GET /api/chat/conversations
// @desc    Get user's conversation history
// @access  Private
router.get('/conversations', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const conversations = await Conversation.getConversationHistory(
    userId,
    parseInt(limit),
    (parseInt(page) - 1) * parseInt(limit)
  );

  const total = await Conversation.countDocuments({ userId, isActive: true });

  res.json({
    success: true,
    conversations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/chat/conversations/:id
// @desc    Get specific conversation
// @access  Private
router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: id,
    userId,
    isActive: true
  });

  if (!conversation) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Conversation not found',
      code: 'CONVERSATION_NOT_FOUND'
    });
  }

  const messages = conversation.getMessages(parseInt(limit), parseInt(offset));

  res.json({
    success: true,
    conversation: {
      id: conversation._id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      statistics: conversation.statistics,
      context: conversation.context
    },
    messages: messages.messages,
    hasMore: messages.hasMore,
    total: messages.total
  });
}));

// @route   PUT /api/chat/conversations/:id/messages/:messageId
// @desc    Update a message
// @access  Private
router.put('/conversations/:id/messages/:messageId', validateMessageUpdate, asyncHandler(async (req, res) => {
  const { id, messageId } = req.params;
  const { content, metadata } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: id,
    userId,
    isActive: true
  });

  if (!conversation) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Conversation not found',
      code: 'CONVERSATION_NOT_FOUND'
    });
  }

  await conversation.updateMessage(messageId, { content, metadata });

  logger.info('Message updated:', { userId, conversationId: id, messageId });

  res.json({
    success: true,
    message: 'Message updated successfully'
  });
}));

// @route   DELETE /api/chat/conversations/:id
// @desc    Delete a conversation
// @access  Private
router.delete('/conversations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: id,
    userId,
    isActive: true
  });

  if (!conversation) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Conversation not found',
      code: 'CONVERSATION_NOT_FOUND'
    });
  }

  conversation.isActive = false;
  await conversation.save();

  logger.info('Conversation deleted:', { userId, conversationId: id });

  res.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}));

// @route   GET /api/chat/active
// @desc    Get current active conversation
// @access  Private
router.get('/active', asyncHandler(async (req, res) => {
  const sessionId = req.sessionId;

  const conversation = await Conversation.findActiveConversation(sessionId);

  if (!conversation) {
    return res.json({
      success: true,
      conversation: null,
      message: 'No active conversation'
    });
  }

  const messages = conversation.getMessages(20, 0); // Last 20 messages

  res.json({
    success: true,
    conversation: {
      id: conversation._id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      statistics: conversation.statistics,
      context: conversation.context
    },
    messages: messages.messages,
    hasMore: messages.hasMore,
    total: messages.total
  });
}));

// @route   POST /api/chat/feedback
// @desc    Submit feedback for a message or conversation
// @access  Private
router.post('/feedback', asyncHandler(async (req, res) => {
  const { 
    conversationId, 
    messageId, 
    rating, 
    feedback, 
    feedbackType = 'general' 
  } = req.body;
  const userId = req.user._id;

  // Validate conversation ownership
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
    isActive: true
  });

  if (!conversation) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Conversation not found',
      code: 'CONVERSATION_NOT_FOUND'
    });
  }

  // Store feedback (you might want to create a separate Feedback model)
  const feedbackData = {
    id: uuidv4(),
    userId,
    conversationId,
    messageId,
    rating,
    feedback,
    feedbackType,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip
  };

  // For now, add to conversation context
  if (!conversation.context.feedback) {
    conversation.context.feedback = [];
  }
  conversation.context.feedback.push(feedbackData);
  await conversation.save();

  logger.info('Feedback submitted:', { 
    userId, 
    conversationId, 
    messageId, 
    rating, 
    feedbackType 
  });

  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    feedbackId: feedbackData.id
  });
}));

// @route   GET /api/chat/statistics
// @desc    Get user's chat statistics
// @access  Private
router.get('/statistics', asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  const userId = req.user._id;

  let dateFilter = {};
  const now = new Date();
  
  switch (timeRange) {
    case '7d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
      break;
    case '30d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
      break;
    case '90d':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
      break;
  }

  const stats = await Conversation.aggregate([
    {
      $match: { userId, isActive: true, ...dateFilter }
    },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        totalMessages: { $sum: '$statistics.messageCount' },
        averageMessagesPerConversation: { $avg: '$statistics.messageCount' },
        averageResponseTime: { $avg: '$statistics.averageResponseTime' },
        totalTokens: { $sum: '$statistics.totalTokens' },
        completedWorkflows: { $sum: '$statistics.workflowsCompleted' }
      }
    }
  ]);

  const statistics = stats[0] || {
    totalConversations: 0,
    totalMessages: 0,
    averageMessagesPerConversation: 0,
    averageResponseTime: 0,
    totalTokens: 0,
    completedWorkflows: 0
  };

  res.json({
    success: true,
    timeRange,
    statistics: {
      ...statistics,
      _id: undefined // Remove the _id field
    }
  });
}));

export default router;