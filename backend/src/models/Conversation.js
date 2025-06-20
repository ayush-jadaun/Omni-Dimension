import mongoose from 'mongoose';
import { MESSAGE_TYPES } from '../config/constants.js';

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 4000
  },
  metadata: {
    agentId: String,
    agentName: String,
    workflowId: String,
    taskId: String,
    processingTime: Number,
    tokens: {
      input: Number,
      output: Number,
      total: Number
    },
    confidence: Number,
    intent: String,
    entities: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    originalContent: String
  }
}, {
  _id: false,
  versionKey: false
});

const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  messages: [messageSchema],
  context: {
    currentIntent: String,
    entities: mongoose.Schema.Types.Mixed,
    workflowHistory: [String],
    preferences: mongoose.Schema.Types.Mixed
  },
  statistics: {
    messageCount: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    workflowsCompleted: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
conversationSchema.index({ sessionId: 1, isActive: 1 });
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ createdAt: -1 });

// Virtual to get latest message
conversationSchema.virtual('latestMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Method to add message
conversationSchema.methods.addMessage = function(messageData) {
  const message = {
    id: messageData.id || new mongoose.Types.ObjectId().toString(),
    role: messageData.role,
    content: messageData.content,
    metadata: messageData.metadata || {},
    timestamp: new Date()
  };

  this.messages.push(message);
  this.lastMessageAt = new Date();
  this.statistics.messageCount = this.messages.length;
  
  // Update total tokens if provided
  if (message.metadata.tokens?.total) {
    this.statistics.totalTokens += message.metadata.tokens.total;
  }

  // Auto-generate title from first user message
  if (!this.title && messageData.role === MESSAGE_TYPES.USER && this.messages.length <= 2) {
    this.title = messageData.content.substring(0, 50) + (messageData.content.length > 50 ? '...' : '');
  }

  return this.save();
};

// Method to update message
conversationSchema.methods.updateMessage = function(messageId, updates) {
  const message = this.messages.id(messageId);
  if (message) {
    if (updates.content && updates.content !== message.content) {
      message.edited.isEdited = true;
      message.edited.editedAt = new Date();
      message.edited.originalContent = message.content;
      message.content = updates.content;
    }
    
    if (updates.metadata) {
      message.metadata = { ...message.metadata, ...updates.metadata };
    }
    
    return this.save();
  }
  return Promise.reject(new Error('Message not found'));
};

// Method to get messages with pagination
conversationSchema.methods.getMessages = function(limit = 50, offset = 0) {
  const messages = this.messages
    .slice(-limit - offset, offset > 0 ? -offset : undefined)
    .reverse();
  
  return {
    messages,
    total: this.messages.length,
    hasMore: this.messages.length > limit + offset
  };
};

// Method to update context
conversationSchema.methods.updateContext = function(contextUpdates) {
  this.context = { ...this.context, ...contextUpdates };
  return this.save();
};

// Method to calculate average response time
conversationSchema.methods.calculateAverageResponseTime = function() {
  const responseTimes = [];
  
  for (let i = 1; i < this.messages.length; i++) {
    const prevMessage = this.messages[i - 1];
    const currentMessage = this.messages[i];
    
    if (prevMessage.role === MESSAGE_TYPES.USER && 
        currentMessage.role === MESSAGE_TYPES.ASSISTANT) {
      const timeDiff = currentMessage.timestamp - prevMessage.timestamp;
      responseTimes.push(timeDiff);
    }
  }
  
  if (responseTimes.length > 0) {
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    this.statistics.averageResponseTime = Math.round(average);
    return this.save({ validateBeforeSave: false });
  }
  
  return Promise.resolve(this);
};

// Static method to find active conversation
conversationSchema.statics.findActiveConversation = function(sessionId) {
  return this.findOne({ sessionId, isActive: true });
};

// Static method to get conversation history
conversationSchema.statics.getConversationHistory = function(userId, limit = 10, offset = 0) {
  return this.find({ userId, isActive: true })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip(offset)
    .select('title lastMessageAt statistics createdAt')
    .lean();
};

export default mongoose.model('Conversation', conversationSchema);