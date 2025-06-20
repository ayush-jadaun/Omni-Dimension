import express from 'express';
import { Workflow, Task } from '../models/index.js';
import { validateWorkflowCreate, validateWorkflowUpdate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, WORKFLOW_STATUS } from '../config/constants.js';
import { getAgent } from '../agents/index.js';
import { publishMessage } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/workflows
// @desc    Get user's workflows
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    type, 
    sortBy = 'createdAt', 
    order = 'desc' 
  } = req.query;
  const userId = req.user._id;

  let filter = { userId };
  
  if (status) filter.status = status;
  if (type) filter.type = type;

  const sort = {};
  sort[sortBy] = order === 'desc' ? -1 : 1;

  const workflows = await Workflow.find(filter)
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Workflow.countDocuments(filter);

  res.json({
    success: true,
    workflows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/workflows/:id
// @desc    Get specific workflow
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const workflow = await Workflow.findOne({ workflowId: id, userId });

  if (!workflow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Workflow not found',
      code: 'WORKFLOW_NOT_FOUND'
    });
  }

  // Get associated tasks
  const tasks = await Task.find({ workflowId: id }).sort({ createdAt: 1 });

  res.json({
    success: true,
    workflow,
    tasks,
    summary: {
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.status === WORKFLOW_STATUS.COMPLETED).length,
      currentStep: workflow.currentStep,
      progress: workflow.progress
    }
  });
}));

// @route   POST /api/workflows
// @desc    Create new workflow
// @access  Private
router.post('/', validateWorkflowCreate, asyncHandler(async (req, res) => {
  const workflowData = req.body;
  const { sessionId, userId } = req.session;

  const workflow = new Workflow({
    ...workflowData,
    workflowId: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    userId,
    metadata: {
      ...workflowData.metadata,
      createdBy: 'user',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  await workflow.save();

  logger.info('Workflow created:', { 
    workflowId: workflow.workflowId, 
    type: workflow.type, 
    userId 
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Workflow created successfully',
    workflow
  });
}));

// @route   PUT /api/workflows/:id
// @desc    Update workflow
// @access  Private
router.put('/:id', validateWorkflowUpdate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user._id;

  const workflow = await Workflow.findOne({ workflowId: id, userId });

  if (!workflow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Workflow not found',
      code: 'WORKFLOW_NOT_FOUND'
    });
  }

  // Only allow updates for certain statuses
  if ([WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.FAILED].includes(workflow.status)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Cannot update completed or failed workflow',
      code: 'WORKFLOW_IMMUTABLE'
    });
  }

  Object.assign(workflow, updates);
  await workflow.save();

  logger.info('Workflow updated:', { workflowId: id, userId });

  res.json({
    success: true,
    message: 'Workflow updated successfully',
    workflow
  });
}));

// @route   POST /api/workflows/:id/cancel
// @desc    Cancel workflow
// @access  Private
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = 'User cancelled' } = req.body;
  const userId = req.user._id;

  const workflow = await Workflow.findOne({ workflowId: id, userId });

  if (!workflow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Workflow not found',
      code: 'WORKFLOW_NOT_FOUND'
    });
  }

  if (!workflow.isActive) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Workflow is not active',
      code: 'WORKFLOW_NOT_ACTIVE'
    });
  }

  await workflow.cancel(reason);

  // Cancel associated tasks
  await Task.updateMany(
    { 
      workflowId: id, 
      status: { $in: [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING] }
    },
    { 
      status: WORKFLOW_STATUS.CANCELLED,
      error: { message: reason, code: 'USER_CANCELLED' },
      completedAt: new Date()
    }
  );

  // Notify orchestrator
  await publishMessage('agent:orchestrator', {
    type: 'workflow_cancelled',
    workflowId: id,
    reason,
    userId,
    timestamp: new Date().toISOString()
  });

  logger.info('Workflow cancelled:', { workflowId: id, reason, userId });

  res.json({
    success: true,
    message: 'Workflow cancelled successfully',
    workflow
  });
}));

// @route   GET /api/workflows/:id/tasks
// @desc    Get workflow tasks
// @access  Private
router.get('/:id/tasks', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Verify workflow ownership
  const workflow = await Workflow.findOne({ workflowId: id, userId });

  if (!workflow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Workflow not found',
      code: 'WORKFLOW_NOT_FOUND'
    });
  }

  const tasks = await Task.find({ workflowId: id }).sort({ createdAt: 1 });

  const taskSummary = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === WORKFLOW_STATUS.PENDING).length,
    running: tasks.filter(t => t.status === WORKFLOW_STATUS.RUNNING).length,
    completed: tasks.filter(t => t.status === WORKFLOW_STATUS.COMPLETED).length,
    failed: tasks.filter(t => t.status === WORKFLOW_STATUS.FAILED).length,
    cancelled: tasks.filter(t => t.status === WORKFLOW_STATUS.CANCELLED).length
  };

  res.json({
    success: true,
    tasks,
    summary: taskSummary
  });
}));

// @route   GET /api/workflows/statistics
// @desc    Get workflow statistics
// @access  Private
router.get('/statistics', asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  const userId = req.user._id;

  const statistics = await Workflow.getStatistics(userId, parseInt(timeRange) || 30);

  res.json({
    success: true,
    timeRange,
    statistics: statistics[0] || {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageDuration: 0,
      totalTokens: 0
    }
  });
}));

// @route   GET /api/workflows/active
// @desc    Get user's active workflows
// @access  Private
router.get('/active', asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const activeWorkflows = await Workflow.findActiveWorkflows(userId);

  res.json({
    success: true,
    workflows: activeWorkflows,
    count: activeWorkflows.length
  });
}));

export default router;