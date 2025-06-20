import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Conversation, Workflow } from "../models/index.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";
import {
  validateChatMessage,
  validateMessageUpdate,
} from "../middleware/validation.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { HTTP_STATUS, MESSAGE_TYPES } from "../config/constants.js";
import { getAgent } from "../agents/index.js";
import { publishMessage } from "../config/redis.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper function to map conversation to frontend format
const mapConversationToFrontend = (conversation) => ({
  _id: conversation._id,
  conversationId: conversation._id.toString(), // Frontend expects this field
  userId: conversation.userId,
  sessionId: conversation.sessionId,
  title: conversation.title,
  status: conversation.isActive ? "active" : "completed",
  messageCount:
    conversation.statistics?.messageCount || conversation.messages?.length || 0,
  lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  metadata: {
    startedBy: conversation.userId,
    currentUser: conversation.userId,
    userAgent: "web",
    platform: "web",
    tags: conversation.context?.tags || [],
    priority: conversation.context?.priority || "normal",
    activeWorkflows: conversation.context?.activeWorkflows || [],
    completedWorkflows: conversation.context?.completedWorkflows || [],
  },
  statistics: conversation.statistics || {
    totalMessages: conversation.messages?.length || 0,
    averageResponseTime: 0,
    userSatisfaction: 0,
    workflowsCompleted: 0,
  },
});

// Helper function to map message to frontend format
const mapMessageToFrontend = (message, conversationId) => ({
  id: message.id || message._id?.toString(),
  conversationId: conversationId,
  sender:
    message.role === "user"
      ? "user"
      : message.role === "system"
      ? "system"
      : "agent",
  content: message.content,
  timestamp:
    message.metadata?.timestamp ||
    message.createdAt ||
    new Date().toISOString(),
  status: "delivered",
  metadata: {
    messageType: message.role,
    context: message.metadata?.context || {},
    agent:
      message.role === "assistant" || message.role === "agent"
        ? "orchestrator"
        : undefined,
    confidence: message.metadata?.confidence || 0.9,
    intent: message.metadata?.intent,
    entities: message.metadata?.entities,
    processingTime: message.metadata?.processingTime,
    currentUser: message.metadata?.userId,
    workflow: message.metadata?.workflow,
    call: message.metadata?.call,
    booking: message.metadata?.booking,
    searchResults: message.metadata?.searchResults,
  },
  reactions: message.reactions || [],
});

// @route   POST /api/chat/message
// @desc    Send a message and get AI response
// @access  Private
router.post(
  "/message",
  chatRateLimiter,
  validateChatMessage,
  asyncHandler(async (req, res) => {
    const {
      message,
      conversationId,
      context = {},
      messageType = "user",
    } = req.body;
    const { sessionId, userId } = req.session;

    logger.info("Chat message received:", {
      userId,
      sessionId,
      conversationId,
      messageLength: message.length,
      messageType,
    });

    // Get or create conversation
    let conversation;

    if (conversationId) {
      // Find conversation by conversationId if provided
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
        isActive: true,
      });

      if (!conversation) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: "Conversation not found",
          code: "CONVERSATION_NOT_FOUND",
        });
      }
    } else {
      // Find active conversation by sessionId or create new one
      conversation = await Conversation.findActiveConversation(sessionId);

      if (!conversation) {
        conversation = new Conversation({
          sessionId,
          userId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          messages: [],
          context: context,
          isActive: true,
          statistics: {
            messageCount: 0,
            averageResponseTime: 0,
            userSatisfaction: 0,
            workflowsCompleted: 0,
          },
        });
        await conversation.save();
      }
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
        userAgent: req.get("User-Agent"),
        userId: userId,
        messageType: messageType,
        context: context,
      },
    });

    // Send real-time update to user
    await publishMessage(`session:${sessionId}`, {
      type: "message_received",
      messageId: userMessageId,
      conversationId: conversation._id.toString(),
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Get orchestrator agent
    const orchestrator = getAgent("orchestrator");

    if (!orchestrator || !orchestrator.isAvailable()) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        error: "AI service temporarily unavailable",
        message: "Please try again in a moment",
        code: "SERVICE_UNAVAILABLE",
      });
    }

    try {
      // Send processing indicator
      await publishMessage(`session:${sessionId}`, {
        type: "processing_started",
        message: "Processing your request...",
        timestamp: new Date().toISOString(),
      });

      // Create task for orchestrator
      const taskId = `chat_${uuidv4()}`;

      // Send task to orchestrator via Redis
      await publishMessage("agent:orchestrator", {
        type: "task_assignment",
        taskId: taskId,
        taskData: {
          action: "process_user_request",
          userMessage: message,
          sessionId: sessionId,
          userId: userId,
          conversationId: conversation._id.toString(),
          context: {
            ...context,
            conversationHistory: conversation.messages.slice(-5), // Last 5 messages for context
            userProfile: req.user.profile,
          },
        },
        workflowId: `chat_workflow_${Date.now()}`,
        sessionId: sessionId,
        priority: 7,
        from: "chat_api",
      });

      // Return immediate response with proper structure
      res.json({
        success: true,
        message: "Message received and being processed",
        response: {
          id: uuidv4(),
          content: "Processing your request...",
          agent: "orchestrator",
          confidence: 0.9,
          intent: "processing",
          suggestions: [],
        },
        conversationId: conversation._id.toString(),
        messageId: userMessageId,
        suggestions: [],
        metadata: {
          conversation: {
            id: conversation._id.toString(),
            messageCount: conversation.messages.length,
            status: "active",
          },
          user: {
            username: req.user.username,
            role: req.user.role,
          },
          timestamp: new Date().toISOString(),
          currentUser: userId,
        },
      });
    } catch (error) {
      logger.error("Error processing chat message:", error);

      // Add error message to conversation
      await conversation.addMessage({
        id: uuidv4(),
        role: MESSAGE_TYPES.SYSTEM,
        content:
          "I apologize, but I encountered an error processing your message. Please try again.",
        metadata: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Processing failed",
        message: "Failed to process your message. Please try again.",
        code: "PROCESSING_FAILED",
      });
    }
  })
);

// @route   POST /api/chat/conversations
// @desc    Start a new conversation (alternative endpoint)
// @access  Private
router.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const { message, context = {} } = req.body;
    const { sessionId, userId } = req.session;

    // Create new conversation
    const conversation = new Conversation({
      sessionId: sessionId || uuidv4(),
      userId,
      title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      messages: [],
      context: context,
      isActive: true,
      statistics: {
        messageCount: 0,
        averageResponseTime: 0,
        userSatisfaction: 0,
        workflowsCompleted: 0,
      },
    });

    await conversation.save();

    // Add the initial message
    const userMessageId = uuidv4();
    await conversation.addMessage({
      id: userMessageId,
      role: MESSAGE_TYPES.USER,
      content: message,
      metadata: {
        timestamp: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        userId: userId,
      },
    });

    // Process with orchestrator
    const orchestrator = getAgent("orchestrator");
    if (orchestrator && orchestrator.isAvailable()) {
      const taskId = `chat_${uuidv4()}`;

      await publishMessage("agent:orchestrator", {
        type: "task_assignment",
        taskId: taskId,
        taskData: {
          action: "process_user_request",
          userMessage: message,
          sessionId: conversation.sessionId,
          userId: userId,
          conversationId: conversation._id.toString(),
          context: {
            ...context,
            userProfile: req.user.profile,
          },
        },
        workflowId: `chat_workflow_${Date.now()}`,
        sessionId: conversation.sessionId,
        priority: 7,
        from: "chat_api",
      });
    }

    const mappedConversation = mapConversationToFrontend(conversation);

    res.json({
      success: true,
      message: "Conversation started successfully",
      response: {
        id: uuidv4(),
        content: "Processing your request...",
        agent: "orchestrator",
        confidence: 0.9,
        intent: "processing",
        suggestions: [],
      },
      conversationId: conversation._id.toString(),
      messageId: userMessageId,
      suggestions: [],
      metadata: {
        conversation: {
          id: conversation._id.toString(),
          messageCount: 1,
          status: "active",
        },
        user: {
          username: req.user.username,
          role: req.user.role,
        },
        timestamp: new Date().toISOString(),
        currentUser: userId,
      },
    });
  })
);

// @route   GET /api/chat/conversations
// @desc    Get user's conversation history
// @access  Private
router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const conversations = await Conversation.getConversationHistory(
      userId,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const mappedConversations = conversations.map(mapConversationToFrontend);
    const total = await Conversation.countDocuments({ userId, isActive: true });

    res.json({
      success: true,
      conversations: mappedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// @route   GET /api/chat/conversations/:id
// @desc    Get specific conversation with messages
// @access  Private
router.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    const messages = conversation.getMessages(
      parseInt(limit),
      parseInt(offset)
    );
    const mappedConversation = mapConversationToFrontend(conversation);
    const mappedMessages = messages.messages.map((msg) =>
      mapMessageToFrontend(msg, conversation._id.toString())
    );

    res.json({
      success: true,
      conversation: mappedConversation,
      messages: mappedMessages,
      hasMore: messages.hasMore,
      total: messages.total,
    });
  })
);

// @route   GET /api/chat/active
// @desc    Get current active conversation
// @access  Private
router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const sessionId = req.sessionId;
    const userId = req.user._id;

    const conversation = await Conversation.findActiveConversation(sessionId);

    if (!conversation) {
      return res.json({
        success: true,
        conversation: null,
        messages: [],
        message: "No active conversation",
      });
    }

    const messages = conversation.getMessages(20, 0); // Last 20 messages
    const mappedConversation = mapConversationToFrontend(conversation);
    const mappedMessages = messages.messages.map((msg) =>
      mapMessageToFrontend(msg, conversation._id.toString())
    );

    res.json({
      success: true,
      conversation: mappedConversation,
      messages: mappedMessages,
      hasMore: messages.hasMore,
      total: messages.total,
    });
  })
);

// @route   PUT /api/chat/conversations/:id/messages/:messageId
// @desc    Update a message
// @access  Private
router.put(
  "/conversations/:id/messages/:messageId",
  validateMessageUpdate,
  asyncHandler(async (req, res) => {
    const { id, messageId } = req.params;
    const { content, metadata } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    await conversation.updateMessage(messageId, {
      content,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    });

    logger.info("Message updated:", { userId, conversationId: id, messageId });

    res.json({
      success: true,
      message: "Message updated successfully",
    });
  })
);

// @route   DELETE /api/chat/conversations/:id
// @desc    Delete a conversation (soft delete)
// @access  Private
router.delete(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    conversation.isActive = false;
    conversation.metadata = {
      ...conversation.metadata,
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    };
    await conversation.save();

    logger.info("Conversation deleted:", { userId, conversationId: id });

    res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  })
);

// @route   POST /api/chat/feedback
// @desc    Submit feedback for a message or conversation
// @access  Private
router.post(
  "/feedback",
  asyncHandler(async (req, res) => {
    const {
      conversationId,
      messageId,
      rating,
      feedback,
      feedbackType = "general",
    } = req.body;
    const userId = req.user._id;

    // Validate conversation ownership
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    // Store feedback
    const feedbackData = {
      id: uuidv4(),
      userId,
      conversationId,
      messageId,
      rating,
      feedback,
      feedbackType,
      timestamp: new Date().toISOString(),
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
    };

    // Add to conversation context
    if (!conversation.context.feedback) {
      conversation.context.feedback = [];
    }
    conversation.context.feedback.push(feedbackData);
    await conversation.save();

    logger.info("Feedback submitted:", {
      userId,
      conversationId,
      messageId,
      rating,
      feedbackType,
    });

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: feedbackData.id,
    });
  })
);

// @route   GET /api/chat/statistics
// @desc    Get user's chat statistics
// @access  Private
router.get(
  "/statistics",
  asyncHandler(async (req, res) => {
    const { timeRange = "30d" } = req.query;
    const userId = req.user._id;

    let dateFilter = {};
    const now = new Date();

    switch (timeRange) {
      case "7d":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "30d":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "90d":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          },
        };
        break;
    }

    const stats = await Conversation.aggregate([
      {
        $match: { userId, isActive: true, ...dateFilter },
      },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: "$statistics.messageCount" },
          averageMessagesPerConversation: { $avg: "$statistics.messageCount" },
          averageResponseTime: { $avg: "$statistics.averageResponseTime" },
          totalTokens: { $sum: "$statistics.totalTokens" },
          completedWorkflows: { $sum: "$statistics.workflowsCompleted" },
        },
      },
    ]);

    const statistics = stats[0] || {
      totalConversations: 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
      averageResponseTime: 0,
      totalTokens: 0,
      completedWorkflows: 0,
    };

    res.json({
      success: true,
      timeRange,
      statistics: {
        ...statistics,
        _id: undefined, // Remove the _id field
      },
    });
  })
);

// @route   POST /api/chat/typing
// @desc    Handle typing indicators
// @access  Private
router.post(
  "/typing",
  asyncHandler(async (req, res) => {
    const { conversationId, isTyping } = req.body;
    const { sessionId, userId } = req.session;

    // Broadcast typing status via WebSocket
    await publishMessage(`session:${sessionId}`, {
      type: "typing_status",
      conversationId,
      isTyping,
      userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Typing status updated",
    });
  })
);

// @route   GET /api/chat/search
// @desc    Search conversations and messages
// @access  Private
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q: query, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "Search query must be at least 2 characters",
        code: "INVALID_QUERY",
      });
    }

    const searchResults = await Conversation.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          $or: [
            { title: { $regex: query, $options: "i" } },
            { "messages.content": { $regex: query, $options: "i" } },
          ],
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    const mappedResults = searchResults.map(mapConversationToFrontend);

    res.json({
      success: true,
      query,
      results: mappedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mappedResults.length,
      },
    });
  })
);

export default router;
