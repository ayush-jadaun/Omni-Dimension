import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { createGeminiLLM } from '../config/langchain.js';
import { publishMessage, subscribeToChannel, unsubscribeFromChannel } from '../config/redis.js';
import { createToolsForAgent } from '../tools/index.js';
import { AGENT_STATUS, REDIS_CHANNELS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class BaseAgent {
  constructor(agentType, capabilities = [], systemPrompt = '') {
    this.id = `${agentType}_${uuidv4()}`;
    this.type = agentType;
    this.capabilities = capabilities;
    this.status = AGENT_STATUS.IDLE;
    this.currentTasks = new Map();
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.startTime = new Date();
    this.lastHeartbeat = new Date();
    
    // LangChain components
    this.llm = createGeminiLLM();
    this.tools = createToolsForAgent(agentType);
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
    this.agent = null;
    this.agentExecutor = null;
    
    // Channels
    this.channels = {
      main: `agent:${this.type}`,
      direct: `agent:${this.id}`,
      broadcast: REDIS_CHANNELS.AGENTS
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info(`Initializing ${this.type} agent: ${this.id}`);
      
      // Create LangChain agent
      await this.createLangChainAgent();
      
      // Subscribe to channels
      await this.subscribeToChannels();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Update status
      await this.updateStatus(AGENT_STATUS.IDLE);
      
      logger.info(`${this.type} agent initialized successfully: ${this.id}`);
      
    } catch (error) {
      logger.error(`Failed to initialize ${this.type} agent:`, error);
      throw error;
    }
  }

  async createLangChainAgent() {
    try {
      // Create prompt template
      const prompt = ChatPromptTemplate.fromTemplate(`
${this.systemPrompt}

You are an AI agent of type: ${this.type}
Your capabilities: ${this.capabilities.join(', ')}
Current time: {currentTime}

You have the following tools available: {tools}

When responding, always:
1. Think step by step about the user's request
2. Use appropriate tools when needed
3. Provide clear, actionable responses
4. Format responses as JSON when communicating with other agents
5. Include confidence scores for your decisions

Current task context: {context}

User request: {input}

{agent_scratchpad}
      `);

      // Create tool calling agent
      this.agent = await createToolCallingAgent({
        llm: this.llm,
        tools: this.tools,
        prompt
      });

      // Create agent executor
      this.agentExecutor = new AgentExecutor({
        agent: this.agent,
        tools: this.tools,
        verbose: process.env.NODE_ENV === 'development',
        maxIterations: 10,
        returnIntermediateSteps: true,
        handleParsingErrors: true
      });

      logger.debug(`LangChain agent created for ${this.type}`);
      
    } catch (error) {
      logger.error(`Error creating LangChain agent for ${this.type}:`, error);
      throw error;
    }
  }

  async subscribeToChannels() {
    try {
      // Subscribe to main agent channel
      await subscribeToChannel(this.channels.main, (message) => {
        this.handleMessage(message);
      });

      // Subscribe to direct channel
      await subscribeToChannel(this.channels.direct, (message) => {
        this.handleMessage(message);
      });

      // Subscribe to broadcast channel
      await subscribeToChannel(this.channels.broadcast, (message) => {
        if (message.type === 'broadcast' && message.target !== this.id) {
          this.handleBroadcastMessage(message);
        }
      });

      logger.debug(`${this.type} agent subscribed to channels`);
      
    } catch (error) {
      logger.error(`Error subscribing to channels for ${this.type}:`, error);
      throw error;
    }
  }

  async handleMessage(message) {
    try {
      logger.debug(`${this.type} agent received message:`, {
        type: message.type,
        from: message.from,
        taskId: message.taskId
      });

      switch (message.type) {
        case 'task_assignment':
          await this.handleTaskAssignment(message);
          break;
        case 'task_update':
          await this.handleTaskUpdate(message);
          break;
        case 'task_cancellation':
          await this.handleTaskCancellation(message);
          break;
        case 'health_check':
          await this.handleHealthCheck(message);
          break;
        case 'status_request':
          await this.handleStatusRequest(message);
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

    } catch (error) {
      logger.error(`Error handling message in ${this.type} agent:`, error);
      await this.sendErrorResponse(message, error);
    }
  }

  async handleTaskAssignment(message) {
    const { taskId, taskData, priority = 5, workflowId, sessionId } = message;
    
    try {
      // Check if already handling this task
      if (this.currentTasks.has(taskId)) {
        logger.warn(`Task ${taskId} already being processed by ${this.id}`);
        return;
      }

      // Update status
      await this.updateStatus(AGENT_STATUS.WORKING);

      // Add task to current tasks
      this.currentTasks.set(taskId, {
        ...taskData,
        startTime: new Date(),
        priority,
        workflowId,
        sessionId
      });

      // Send acknowledgment
      await this.sendTaskResponse(taskId, 'task_started', {
        agentId: this.id,
        agentType: this.type,
        startTime: new Date().toISOString()
      });

      // Execute task
      const result = await this.executeTask(taskId, taskData);

      // Send completion
      await this.sendTaskResponse(taskId, 'task_completed', {
        agentId: this.id,
        agentType: this.type,
        result,
        completedAt: new Date().toISOString()
      });

      // Clean up
      this.currentTasks.delete(taskId);
      this.completedTasks++;

      // Update status
      if (this.currentTasks.size === 0) {
        await this.updateStatus(AGENT_STATUS.IDLE);
      }

    } catch (error) {
      logger.error(`Task execution failed for ${taskId}:`, error);
      
      // Send failure response
      await this.sendTaskResponse(taskId, 'task_failed', {
        agentId: this.id,
        agentType: this.type,
        error: {
          message: error.message,
          code: error.code || 'TASK_EXECUTION_ERROR'
        },
        failedAt: new Date().toISOString()
      });

      // Clean up
      this.currentTasks.delete(taskId);
      this.failedTasks++;

      if (this.currentTasks.size === 0) {
        await this.updateStatus(AGENT_STATUS.IDLE);
      }
    }
  }

  async executeTask(taskId, taskData) {
    const task = this.currentTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    logger.info(`Executing task ${taskId} on ${this.type} agent`);

    // Prepare context for LangChain agent
    const context = {
      taskId,
      workflowId: task.workflowId,
      sessionId: task.sessionId,
      agentType: this.type,
      currentTime: new Date().toISOString(),
      ...task
    };

    // Execute using LangChain agent
    const result = await this.agentExecutor.invoke({
      input: taskData.action || taskData.prompt || taskData.query,
      context: JSON.stringify(context),
      currentTime: new Date().toISOString()
    });

    return {
      output: result.output,
      intermediateSteps: result.intermediateSteps,
      metadata: {
        agentId: this.id,
        agentType: this.type,
        processingTime: Date.now() - task.startTime.getTime(),
        toolsUsed: this.extractToolsUsed(result.intermediateSteps)
      }
    };
  }

  async handleTaskUpdate(message) {
    const { taskId, updates } = message;
    
    if (this.currentTasks.has(taskId)) {
      const task = this.currentTasks.get(taskId);
      Object.assign(task, updates);
      
      logger.debug(`Task ${taskId} updated in ${this.type} agent`);
      
      // Send acknowledgment
      await this.sendTaskResponse(taskId, 'task_updated', {
        agentId: this.id,
        updates,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async handleTaskCancellation(message) {
    const { taskId, reason } = message;
    
    if (this.currentTasks.has(taskId)) {
      this.currentTasks.delete(taskId);
      
      logger.info(`Task ${taskId} cancelled in ${this.type} agent: ${reason}`);
      
      // Send acknowledgment
      await this.sendTaskResponse(taskId, 'task_cancelled', {
        agentId: this.id,
        reason,
        cancelledAt: new Date().toISOString()
      });

      if (this.currentTasks.size === 0) {
        await this.updateStatus(AGENT_STATUS.IDLE);
      }
    }
  }

  async handleHealthCheck(message) {
    const health = {
      agentId: this.id,
      agentType: this.type,
      status: this.status,
      uptime: Date.now() - this.startTime.getTime(),
      currentTasks: this.currentTasks.size,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    await publishMessage(`response:${message.from}`, {
      type: 'health_response',
      requestId: message.requestId,
      health
    });
  }

  async handleStatusRequest(message) {
    const status = {
      agentId: this.id,
      agentType: this.type,
      status: this.status,
      capabilities: this.capabilities,
      currentTasks: Array.from(this.currentTasks.keys()),
      statistics: {
        completed: this.completedTasks,
        failed: this.failedTasks,
        success_rate: this.completedTasks / (this.completedTasks + this.failedTasks) || 0
      },
      timestamp: new Date().toISOString()
    };

    await publishMessage(`response:${message.from}`, {
      type: 'status_response',
      requestId: message.requestId,
      status
    });
  }

  async handleBroadcastMessage(message) {
    logger.debug(`${this.type} agent received broadcast:`, message.type);
    
    switch (message.type) {
      case 'system_shutdown':
        await this.shutdown();
        break;
      case 'reload_config':
        await this.reloadConfiguration();
        break;
      case 'clear_cache':
        await this.clearCache();
        break;
    }
  }

  async sendTaskResponse(taskId, type, data) {
    await publishMessage(REDIS_CHANNELS.ORCHESTRATOR, {
      type,
      taskId,
      from: this.id,
      agentType: this.type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  async sendErrorResponse(originalMessage, error) {
    if (originalMessage.from) {
      await publishMessage(`response:${originalMessage.from}`, {
        type: 'error_response',
        requestId: originalMessage.requestId,
        error: {
          message: error.message,
          code: error.code || 'AGENT_ERROR',
          agentId: this.id,
          agentType: this.type
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async updateStatus(newStatus) {
    this.status = newStatus;
    this.lastHeartbeat = new Date();
    
    // Update status in Redis
    await publishMessage(REDIS_CHANNELS.AGENTS, {
      type: 'status_update',
      agentId: this.id,
      agentType: this.type,
      status: newStatus,
      timestamp: new Date().toISOString()
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        this.lastHeartbeat = new Date();
        
        await publishMessage(REDIS_CHANNELS.AGENTS, {
          type: 'heartbeat',
          agentId: this.id,
          agentType: this.type,
          status: this.status,
          currentTasks: this.currentTasks.size,
          timestamp: this.lastHeartbeat.toISOString()
        });
        
      } catch (error) {
        logger.error(`Heartbeat error for ${this.type} agent:`, error);
      }
    }, 30000); // Every 30 seconds
  }

  extractToolsUsed(intermediateSteps) {
    if (!intermediateSteps || !Array.isArray(intermediateSteps)) return [];
    
    return intermediateSteps
      .map(step => step.action?.tool)
      .filter(tool => tool)
      .reduce((unique, tool) => {
        if (!unique.includes(tool)) unique.push(tool);
        return unique;
      }, []);
  }

  getDefaultSystemPrompt() {
    return `
You are a specialized AI agent responsible for ${this.type} operations.
You work as part of a multi-agent system coordinated by an orchestrator agent.

Your core responsibilities:
- Process tasks assigned to you efficiently and accurately
- Communicate clearly with other agents and the orchestrator
- Use available tools to gather information and perform actions
- Provide detailed, structured responses
- Handle errors gracefully and report issues

When processing tasks:
1. Analyze the request thoroughly
2. Break down complex tasks into steps
3. Use appropriate tools for each step
4. Validate results before responding
5. Provide confidence scores for decisions

Always maintain context awareness and consider the broader workflow objectives.
    `;
  }

  async reloadConfiguration() {
    logger.info(`Reloading configuration for ${this.type} agent`);
    // Reload any configuration as needed
  }

  async clearCache() {
    logger.info(`Clearing cache for ${this.type} agent`);
    // Clear any cached data
  }

  async shutdown() {
    try {
      logger.info(`Shutting down ${this.type} agent: ${this.id}`);
      
      // Cancel all current tasks
      for (const [taskId] of this.currentTasks) {
        await this.sendTaskResponse(taskId, 'task_cancelled', {
          agentId: this.id,
          reason: 'Agent shutdown',
          cancelledAt: new Date().toISOString()
        });
      }
      
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      // Unsubscribe from channels
      await unsubscribeFromChannel(this.channels.main);
      await unsubscribeFromChannel(this.channels.direct);
      await unsubscribeFromChannel(this.channels.broadcast);
      
      // Update status
      await this.updateStatus(AGENT_STATUS.OFFLINE);
      
      logger.info(`${this.type} agent shutdown complete: ${this.id}`);
      
    } catch (error) {
      logger.error(`Error during ${this.type} agent shutdown:`, error);
    }
  }

  // Public methods for external use
  getStatus() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      capabilities: this.capabilities,
      currentTasks: this.currentTasks.size,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      uptime: Date.now() - this.startTime.getTime(),
      lastHeartbeat: this.lastHeartbeat
    };
  }

  isAvailable() {
    return this.status === AGENT_STATUS.IDLE || 
           (this.status === AGENT_STATUS.WORKING && this.currentTasks.size < 3);
  }

  canHandle(taskType) {
    return this.capabilities.includes(taskType) || this.capabilities.includes('*');
  }
}

export default BaseAgent;