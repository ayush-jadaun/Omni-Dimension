import mongoose from 'mongoose';
import { WORKFLOW_STATUS, WORKFLOW_TYPES, AGENT_TYPES } from '../config/constants.js';

const stepSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  agentType: {
    type: String,
    enum: Object.values(AGENT_TYPES),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(WORKFLOW_STATUS),
    default: WORKFLOW_STATUS.PENDING
  },
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  error: {
    message: String,
    code: String,
    stack: String,
    retryable: Boolean
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number, // in milliseconds
  retryCount: {
    type: Number,
    default: 0
  },
  dependencies: [String], // Array of step IDs this step depends on
  metadata: mongoose.Schema.Types.Mixed
}, {
  _id: false,
  versionKey: false
});

const workflowSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
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
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true
  },
  type: {
    type: String,
    enum: Object.values(WORKFLOW_TYPES),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(WORKFLOW_STATUS),
    default: WORKFLOW_STATUS.PENDING,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  intent: {
    name: String,
    confidence: Number,
    entities: mongoose.Schema.Types.Mixed
  },
  steps: [stepSchema],
  currentStepIndex: {
    type: Number,
    default: 0
  },
  result: {
    success: Boolean,
    data: mongoose.Schema.Types.Mixed,
    message: String,
    confidence: Number
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  tags: [String],
  startedAt: Date,
  completedAt: Date,
  estimatedDuration: Number, // in milliseconds
  actualDuration: Number, // in milliseconds
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  statistics: {
    totalSteps: {
      type: Number,
      default: 0
    },
    completedSteps: {
      type: Number,
      default: 0
    },
    failedSteps: {
      type: Number,
      default: 0
    },
    totalRetries: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: String,
    version: String,
    custom: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
workflowSchema.index({ userId: 1, status: 1 });
workflowSchema.index({ type: 1, status: 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ startedAt: -1 });
workflowSchema.index({ priority: -1, createdAt: 1 });

// Virtual to check if workflow is active
workflowSchema.virtual('isActive').get(function() {
  return [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING].includes(this.status);
});

// Virtual to get current step
workflowSchema.virtual('currentStep').get(function() {
  return this.steps[this.currentStepIndex] || null;
});

// Virtual to get next step
workflowSchema.virtual('nextStep').get(function() {
  return this.steps[this.currentStepIndex + 1] || null;
});

// Method to start workflow
workflowSchema.methods.start = function() {
  this.status = WORKFLOW_STATUS.RUNNING;
  this.startedAt = new Date();
  this.statistics.totalSteps = this.steps.length;
  return this.save();
};

// Method to complete workflow
workflowSchema.methods.complete = function(result = {}) {
  this.status = WORKFLOW_STATUS.COMPLETED;
  this.completedAt = new Date();
  this.progress = 100;
  
  if (this.startedAt) {
    this.actualDuration = this.completedAt - this.startedAt;
  }
  
  this.result = {
    success: true,
    ...result
  };
  
  return this.save();
};

// Method to fail workflow
workflowSchema.methods.fail = function(error) {
  this.status = WORKFLOW_STATUS.FAILED;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.actualDuration = this.completedAt - this.startedAt;
  }
  
  this.result = {
    success: false,
    message: error.message || 'Workflow failed',
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    }
  };
  
  return this.save();
};

// Method to cancel workflow
workflowSchema.methods.cancel = function(reason = 'User cancelled') {
  this.status = WORKFLOW_STATUS.CANCELLED;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.actualDuration = this.completedAt - this.startedAt;
  }
  
  this.result = {
    success: false,
    message: reason
  };
  
  return this.save();
};

// Method to add step
workflowSchema.methods.addStep = function(stepData) {
  const step = {
    id: stepData.id || new mongoose.Types.ObjectId().toString(),
    name: stepData.name,
    agentType: stepData.agentType,
    input: stepData.input,
    dependencies: stepData.dependencies || [],
    metadata: stepData.metadata || {}
  };
  
  this.steps.push(step);
  this.statistics.totalSteps = this.steps.length;
  return this.save();
};

// Method to update step
workflowSchema.methods.updateStep = function(stepId, updates) {
  const step = this.steps.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  // Update step properties
  Object.assign(step, updates);
  
  // Update timestamps
  if (updates.status === WORKFLOW_STATUS.RUNNING && !step.startedAt) {
    step.startedAt = new Date();
  }
  
  if ([WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.FAILED].includes(updates.status)) {
    step.completedAt = new Date();
    if (step.startedAt) {
      step.duration = step.completedAt - step.startedAt;
    }
    
    // Update statistics
    if (updates.status === WORKFLOW_STATUS.COMPLETED) {
      this.statistics.completedSteps += 1;
    } else {
      this.statistics.failedSteps += 1;
    }
    
    // Update progress
    this.progress = Math.round((this.statistics.completedSteps / this.statistics.totalSteps) * 100);
  }
  
  return this.save();
};

// Method to move to next step
workflowSchema.methods.moveToNextStep = function() {
  if (this.currentStepIndex < this.steps.length - 1) {
    this.currentStepIndex += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to get step by ID
workflowSchema.methods.getStep = function(stepId) {
  return this.steps.find(s => s.id === stepId);
};

// Method to get pending steps
workflowSchema.methods.getPendingSteps = function() {
  return this.steps.filter(s => s.status === WORKFLOW_STATUS.PENDING);
};

// Method to get ready steps (pending steps with satisfied dependencies)
workflowSchema.methods.getReadySteps = function() {
  return this.steps.filter(step => {
    if (step.status !== WORKFLOW_STATUS.PENDING) return false;
    
    return step.dependencies.every(depId => {
      const depStep = this.steps.find(s => s.id === depId);
      return depStep && depStep.status === WORKFLOW_STATUS.COMPLETED;
    });
  });
};

// Static method to find active workflows
workflowSchema.statics.findActiveWorkflows = function(userId) {
  return this.find({
    userId,
    status: { $in: [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING] }
  }).sort({ priority: -1, createdAt: 1 });
};

// Static method to get workflow statistics
workflowSchema.statics.getStatistics = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.COMPLETED] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.FAILED] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.CANCELLED] }, 1, 0] }
        },
        averageDuration: { $avg: '$actualDuration' },
        totalTokens: { $sum: '$statistics.tokensUsed' }
      }
    }
  ]);
};

export default mongoose.model('Workflow', workflowSchema);