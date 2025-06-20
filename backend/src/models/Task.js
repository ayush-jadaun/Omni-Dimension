import mongoose from 'mongoose';
import { WORKFLOW_STATUS, AGENT_TYPES } from '../config/constants.js';

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  workflowId: {
    type: String,
    required: true,
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
  agentType: {
    type: String,
    enum: Object.values(AGENT_TYPES),
    required: true
  },
  agentId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(WORKFLOW_STATUS),
    default: WORKFLOW_STATUS.PENDING,
    index: true
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  input: {
    action: String,
    parameters: mongoose.Schema.Types.Mixed,
    context: mongoose.Schema.Types.Mixed
  },
  output: {
    result: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    confidence: Number
  },
  error: {
    message: String,
    code: String,
    stack: String,
    retryable: {
      type: Boolean,
      default: false
    }
  },
  dependencies: [String], // Array of task IDs this task depends on
  dependents: [String], // Array of task IDs that depend on this task
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  timeout: {
    type: Number,
    default: 30000 // 30 seconds
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number, // in milliseconds
  estimatedDuration: Number, // in milliseconds
  metrics: {
    apiCalls: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    memoryUsed: Number,
    cpuTime: Number
  },
  tags: [String],
  metadata: {
    source: String,
    version: String,
    custom: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
taskSchema.index({ agentType: 1, status: 1 });
taskSchema.index({ workflowId: 1, status: 1 });
taskSchema.index({ priority: -1, createdAt: 1 });
taskSchema.index({ startedAt: -1 });

// Virtual to check if task is active
taskSchema.virtual('isActive').get(function() {
  return [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING].includes(this.status);
});

// Virtual to check if task can be retried
taskSchema.virtual('canRetry').get(function() {
  return this.status === WORKFLOW_STATUS.FAILED && 
         this.error?.retryable && 
         this.retryCount < this.maxRetries;
});

// Virtual to check if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.startedAt || this.status !== WORKFLOW_STATUS.RUNNING) return false;
  return (Date.now() - this.startedAt.getTime()) > this.timeout;
});

// Method to start task
taskSchema.methods.start = function() {
  this.status = WORKFLOW_STATUS.RUNNING;
  this.startedAt = new Date();
  return this.save();
};

// Method to complete task
taskSchema.methods.complete = function(result) {
  this.status = WORKFLOW_STATUS.COMPLETED;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }
  
  this.output = {
    result,
    metadata: {
      completedAt: this.completedAt,
      duration: this.duration
    }
  };
  
  return this.save();
};

// Method to fail task
taskSchema.methods.fail = function(error) {
  this.status = WORKFLOW_STATUS.FAILED;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }
  
  this.error = {
    message: error.message || 'Task failed',
    code: error.code || 'TASK_FAILED',
    stack: error.stack,
    retryable: error.retryable || false
  };
  
  return this.save();
};

// Method to retry task
taskSchema.methods.retry = function() {
  if (!this.canRetry) {
    throw new Error('Task cannot be retried');
  }
  
  this.status = WORKFLOW_STATUS.PENDING;
  this.retryCount += 1;
  this.startedAt = null;
  this.completedAt = null;
  this.duration = null;
  this.error = null;
  
  return this.save();
};

// Method to cancel task
taskSchema.methods.cancel = function(reason = 'Task cancelled') {
  this.status = WORKFLOW_STATUS.CANCELLED;
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }
  
  this.error = {
    message: reason,
    code: 'TASK_CANCELLED'
  };
  
  return this.save();
};

// Method to update progress
taskSchema.methods.updateProgress = function(progressData) {
  this.output = {
    ...this.output,
    metadata: {
      ...this.output?.metadata,
      ...progressData,
      updatedAt: new Date()
    }
  };
  
  return this.save({ validateBeforeSave: false });
};

// Method to add metrics
taskSchema.methods.addMetrics = function(metrics) {
  this.metrics = {
    ...this.metrics,
    ...metrics
  };
  
  return this.save({ validateBeforeSave: false });
};

// Static method to find tasks by agent
taskSchema.statics.findByAgent = function(agentType, status = null) {
  const query = { agentType };
  if (status) query.status = status;
  
  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

// Static method to find ready tasks (dependencies satisfied)
taskSchema.statics.findReadyTasks = function(agentType) {
  return this.aggregate([
    {
      $match: {
        agentType,
        status: WORKFLOW_STATUS.PENDING
      }
    },
    {
      $lookup: {
        from: 'tasks',
        localField: 'dependencies',
        foreignField: 'taskId',
        as: 'dependencyTasks'
      }
    },
    {
      $match: {
        $or: [
          { dependencies: { $size: 0 } },
          {
            $expr: {
              $allElementsTrue: {
                $map: {
                  input: '$dependencyTasks',
                  as: 'dep',
                  in: { $eq: ['$$dep.status', WORKFLOW_STATUS.COMPLETED] }
                }
              }
            }
          }
        ]
      }
    },
    {
      $sort: { priority: -1, createdAt: 1 }
    }
  ]);
};

// Static method to cleanup old completed tasks
taskSchema.statics.cleanupOldTasks = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: [WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.CANCELLED] },
    completedAt: { $lt: cutoffDate }
  });
};

// Static method to get task statistics
taskSchema.statics.getStatistics = function(agentType = null, timeRange = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeRange);
  
  const matchStage = {
    createdAt: { $gte: startDate }
  };
  
  if (agentType) {
    matchStage.agentType = agentType;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$agentType',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.COMPLETED] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.FAILED] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.PENDING] }, 1, 0] }
        },
        running: {
          $sum: { $cond: [{ $eq: ['$status', WORKFLOW_STATUS.RUNNING] }, 1, 0] }
        },
        averageDuration: { $avg: '$duration' },
        totalRetries: { $sum: '$retryCount' },
        totalApiCalls: { $sum: '$metrics.apiCalls' },
        totalTokens: { $sum: '$metrics.tokensUsed' }
      }
    }
  ]);
};

export default mongoose.model('Task', taskSchema);