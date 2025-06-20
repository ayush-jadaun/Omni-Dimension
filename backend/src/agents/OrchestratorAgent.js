import BaseAgent from './BaseAgent.js';
import { AGENT_TYPES, WORKFLOW_STATUS, WORKFLOW_TYPES,REDIS_CHANNELS } from '../config/constants.js';
import { publishMessage } from '../config/redis.js';
import { Workflow, Task } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { subscribeToChannel } from '../config/redis.js';
export class OrchestratorAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      'workflow_management',
      'task_orchestration',
      'agent_coordination',
      'decision_making',
      'user_interaction'
    ];

    const systemPrompt = `
You are the Orchestrator Agent, the central coordinator of the multi-agent system.

Your primary responsibilities:
1. Receive user requests and determine the appropriate workflow
2. Break down complex tasks into manageable steps
3. Assign tasks to specialized agents (NLP, Search, OmniDimension, Monitoring)
4. Monitor workflow progress and handle failures
5. Coordinate between agents to ensure smooth execution
6. Provide status updates to users
7. Make decisions about workflow routing and optimization

Available agent types and their capabilities:
- NLP Agent: Intent parsing, entity extraction, text generation, analysis
- Search Agent: Google Places search, business lookup, location services
- OmniDimension Agent: Voice calling, appointment booking, calendar integration
- Monitoring Agent: System health, metrics collection, performance analysis

Workflow types you can handle:
- appointment: Medical, dental, beauty, professional services
- restaurant: Reservations, delivery, takeout orders
- custom: User-defined automation tasks
- general_query: Information requests, Q&A

When receiving a user request:
1. Analyze intent and extract entities using NLP Agent
2. Determine appropriate workflow type
3. Create workflow with necessary steps
4. Assign tasks to appropriate agents
5. Monitor execution and handle coordination
6. Provide final response to user

Always prioritize user experience and workflow efficiency.
    `;

    super(AGENT_TYPES.ORCHESTRATOR, capabilities, systemPrompt);
    
    this.activeWorkflows = new Map();
    this.agentRegistry = new Map();
    this.taskQueue = [];
    this.initialize();
  }

  async initialize() {
    await super.initialize();
    
    // Start workflow monitoring
    this.startWorkflowMonitoring();
    
    // Start agent registry updates
    this.startAgentRegistryUpdates();
    
    logger.info('Orchestrator Agent initialized with enhanced capabilities');
  }

  async executeTask(taskId, taskData) {
    logger.info(`Orchestrator executing task: ${taskId}`, taskData);

    try {
      switch (taskData.action) {
        case 'process_user_request':
          return await this.processUserRequest(taskData);
        case 'create_workflow':
          return await this.createWorkflow(taskData);
        case 'manage_workflow':
          return await this.manageWorkflow(taskData);
        case 'coordinate_agents':
          return await this.coordinateAgents(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(`Orchestrator task execution failed:`, error);
      throw error;
    }
  }

  async processUserRequest(taskData) {
    const { userMessage, sessionId, userId, context = {} } = taskData;
    
    logger.info('Processing user request:', { userMessage, sessionId, userId });

    // Step 1: Parse intent using NLP Agent
    const intentAnalysis = await this.delegateToAgent('nlp', {
      action: 'parse_intent',
      text: userMessage,
      context: context
    });

    if (!intentAnalysis.success) {
      throw new Error('Failed to parse user intent');
    }

    const { intent, entities, workflow_type, confidence } = intentAnalysis.result;

    logger.info('Intent analysis:', { intent, workflow_type, confidence });

    // Step 2: Create appropriate workflow
    const workflowData = {
      type: workflow_type,
      title: this.generateWorkflowTitle(intent, entities),
      description: `User request: ${userMessage}`,
      intent: { name: intent, confidence, entities },
      sessionId,
      userId,
      priority: this.calculatePriority(intent, entities),
      metadata: { originalMessage: userMessage, context }
    };

    const workflow = await this.createWorkflow(workflowData);

    // Step 3: Execute workflow based on type
    switch (workflow_type) {
      case WORKFLOW_TYPES.APPOINTMENT:
        return await this.executeAppointmentWorkflow(workflow, entities);
      case WORKFLOW_TYPES.RESTAURANT:
        return await this.executeRestaurantWorkflow(workflow, entities);
      case WORKFLOW_TYPES.GENERAL_QUERY:
        return await this.executeGeneralQueryWorkflow(workflow, entities);
      default:
        return await this.executeCustomWorkflow(workflow, entities);
    }
  }

  async createWorkflow(workflowData) {
    const workflowId = `wf_${uuidv4()}`;
    
    const workflow = new Workflow({
      workflowId,
      sessionId: workflowData.sessionId,
      userId: workflowData.userId,
      type: workflowData.type,
      title: workflowData.title,
      description: workflowData.description,
      intent: workflowData.intent,
      priority: workflowData.priority || 5,
      metadata: workflowData.metadata || {}
    });

    await workflow.save();
    await workflow.start();

    this.activeWorkflows.set(workflowId, workflow);

    logger.info(`Workflow created: ${workflowId} (${workflowData.type})`);

    // Notify user
    await this.notifyUser(workflowData.sessionId, {
      type: 'workflow_started',
      workflowId,
      message: `I'm working on your request: ${workflowData.title}`,
      status: 'started'
    });

    return workflow;
  }

  async executeAppointmentWorkflow(workflow, entities) {
    logger.info(`Executing appointment workflow: ${workflow.workflowId}`);

    try {
      // Step 1: Search for relevant service providers
      const searchTask = await this.createAndAssignTask(workflow, {
        agentType: 'search',
        name: 'search_service_providers',
        action: 'search_places',
        parameters: {
          query: `${entities.service_type || 'healthcare'} ${entities.location || ''}`,
          location: entities.location || entities.user_location,
          filters: {
            type: this.mapServiceTypeToPlaceType(entities.service_type),
            minRating: 4.0,
            radius: 10000,
            limit: 5
          }
        }
      });

      // Wait for search results
      const searchResults = await this.waitForTaskCompletion(searchTask.taskId);
      
      if (!searchResults.success) {
        throw new Error('Failed to find service providers');
      }

      // Step 2: Use OmniDimension to call and book appointment
      const bookingTask = await this.createAndAssignTask(workflow, {
        agentType: 'omnidimension',
        name: 'book_appointment',
        action: 'make_appointment_calls',
        parameters: {
          providers: searchResults.result.places,
          appointment_type: entities.service_type,
          preferred_time: entities.date_time,
          user_info: {
            name: entities.contact_info?.name,
            phone: entities.contact_info?.phone,
            email: entities.contact_info?.email
          },
          preferences: entities.preferences
        },
        dependencies: [searchTask.taskId]
      });

      // Wait for booking completion
      const bookingResults = await this.waitForTaskCompletion(bookingTask.taskId);

      if (bookingResults.success) {
        await workflow.complete({
          appointment: bookingResults.result,
          providers_searched: searchResults.result.places.length,
          success: true
        });

        await this.notifyUser(workflow.sessionId, {
          type: 'workflow_completed',
          workflowId: workflow.workflowId,
          message: `Great! I've successfully booked your appointment.`,
          result: bookingResults.result
        });

        return {
          success: true,
          workflow: workflow.workflowId,
          result: bookingResults.result
        };
      } else {
        throw new Error('Failed to book appointment');
      }

    } catch (error) {
      logger.error(`Appointment workflow failed:`, error);
      await workflow.fail(error);
      
      await this.notifyUser(workflow.sessionId, {
        type: 'workflow_failed',
        workflowId: workflow.workflowId,
        message: `I couldn't complete your appointment booking: ${error.message}`,
        error: error.message
      });

      throw error;
    }
  }

  async executeRestaurantWorkflow(workflow, entities) {
    logger.info(`Executing restaurant workflow: ${workflow.workflowId}`);

    try {
      // Step 1: Search for restaurants
      const searchTask = await this.createAndAssignTask(workflow, {
        agentType: 'search',
        name: 'search_restaurants',
        action: 'search_places',
        parameters: {
          query: `${entities.cuisine_type || 'restaurant'} ${entities.location || ''}`,
          location: entities.location || entities.user_location,
          filters: {
            type: 'restaurant',
            minRating: entities.min_rating || 4.0,
            priceLevel: entities.price_level,
            radius: 5000,
            limit: 8
          }
        }
      });

      const searchResults = await this.waitForTaskCompletion(searchTask.taskId);

      if (!searchResults.success) {
        throw new Error('Failed to find restaurants');
      }

      // Step 2: Make reservations using OmniDimension
      const reservationTask = await this.createAndAssignTask(workflow, {
        agentType: 'omnidimension',
        name: 'make_reservation',
        action: 'make_reservation_calls',
        parameters: {
          restaurants: searchResults.result.places,
          reservation_time: entities.date_time,
          party_size: entities.party_size || 2,
          user_info: {
            name: entities.contact_info?.name,
            phone: entities.contact_info?.phone
          },
          preferences: entities.preferences
        },
        dependencies: [searchTask.taskId]
      });

      const reservationResults = await this.waitForTaskCompletion(reservationTask.taskId);

      if (reservationResults.success) {
        await workflow.complete({
          reservation: reservationResults.result,
          restaurants_searched: searchResults.result.places.length,
          success: true
        });

        await this.notifyUser(workflow.sessionId, {
          type: 'workflow_completed',
          workflowId: workflow.workflowId,
          message: `Perfect! I've made your restaurant reservation.`,
          result: reservationResults.result
        });

        return {
          success: true,
          workflow: workflow.workflowId,
          result: reservationResults.result
        };
      } else {
        throw new Error('Failed to make reservation');
      }

    } catch (error) {
      logger.error(`Restaurant workflow failed:`, error);
      await workflow.fail(error);
      
      await this.notifyUser(workflow.sessionId, {
        type: 'workflow_failed',
        workflowId: workflow.workflowId,
        message: `I couldn't complete your restaurant reservation: ${error.message}`,
        error: error.message
      });

      throw error;
    }
  }

  async executeGeneralQueryWorkflow(workflow, entities) {
    logger.info(`Executing general query workflow: ${workflow.workflowId}`);

    try {
      // Use NLP agent to generate response
      const responseTask = await this.createAndAssignTask(workflow, {
        agentType: 'nlp',
        name: 'generate_response',
        action: 'text_generation',
        parameters: {
          prompt: workflow.metadata.originalMessage,
          context: entities,
          task: 'general_query_response'
        }
      });

      const responseResults = await this.waitForTaskCompletion(responseTask.taskId);

      if (responseResults.success) {
        await workflow.complete({
          response: responseResults.result,
          success: true
        });

        await this.notifyUser(workflow.sessionId, {
          type: 'workflow_completed',
          workflowId: workflow.workflowId,
          message: responseResults.result,
          result: { type: 'text_response', content: responseResults.result }
        });

        return {
          success: true,
          workflow: workflow.workflowId,
          result: responseResults.result
        };
      } else {
        throw new Error('Failed to generate response');
      }

    } catch (error) {
      logger.error(`General query workflow failed:`, error);
      await workflow.fail(error);
      throw error;
    }
  }

  async createAndAssignTask(workflow, taskData) {
    const taskId = `task_${uuidv4()}`;
    
    const task = new Task({
      taskId,
      workflowId: workflow.workflowId,
      sessionId: workflow.sessionId,
      userId: workflow.userId,
      agentType: taskData.agentType,
      agentId: '', // Will be filled when assigned
      name: taskData.name,
      description: taskData.description || taskData.name,
      input: {
        action: taskData.action,
        parameters: taskData.parameters || {},
        context: taskData.context || {}
      },
      dependencies: taskData.dependencies || [],
      priority: taskData.priority || workflow.priority,
      timeout: taskData.timeout || 60000,
      metadata: taskData.metadata || {}
    });

    await task.save();

    // Add step to workflow
    await workflow.addStep({
      id: taskId,
      name: taskData.name,
      agentType: taskData.agentType,
      input: task.input,
      dependencies: task.dependencies
    });

    // Assign to agent
    await this.assignTaskToAgent(task);

    logger.info(`Task created and assigned: ${taskId} to ${taskData.agentType} agent`);

    return task;
  }

  async assignTaskToAgent(task) {
    const availableAgents = this.getAvailableAgents(task.agentType);
    
    if (availableAgents.length === 0) {
      throw new Error(`No available ${task.agentType} agents`);
    }

    // Select best agent (simple round-robin for now)
    const selectedAgent = availableAgents[0];
    task.agentId = selectedAgent.id;
    await task.save();

    // Send task assignment
    await publishMessage(`agent:${task.agentType}`, {
      type: 'task_assignment',
      taskId: task.taskId,
      taskData: {
        action: task.input.action,
        parameters: task.input.parameters,
        context: task.input.context
      },
      workflowId: task.workflowId,
      sessionId: task.sessionId,
      priority: task.priority,
      from: this.id
    });

    logger.debug(`Task ${task.taskId} assigned to agent ${selectedAgent.id}`);
  }

  async waitForTaskCompletion(taskId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out`));
      }, timeout);

      const checkCompletion = async () => {
        try {
          const task = await Task.findOne({ taskId });
          
          if (task && task.status === WORKFLOW_STATUS.COMPLETED) {
            clearTimeout(timer);
            resolve({
              success: true,
              result: task.output.result,
              metadata: task.output.metadata
            });
          } else if (task && task.status === WORKFLOW_STATUS.FAILED) {
            clearTimeout(timer);
            resolve({
              success: false,
              error: task.error
            });
          } else {
            // Check again after a delay
            setTimeout(checkCompletion, 1000);
          }
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      };

      checkCompletion();
    });
  }

  async delegateToAgent(agentType, taskData) {
    const task = await this.createAndAssignTask({ 
      workflowId: 'direct_delegation',
      sessionId: 'orchestrator',
      userId: 'system',
      priority: 8
    }, {
      agentType,
      name: 'direct_delegation',
      action: taskData.action,
      parameters: taskData,
      timeout: 30000
    });

    return await this.waitForTaskCompletion(task.taskId, 30000);
  }

  getAvailableAgents(agentType) {
    return Array.from(this.agentRegistry.values())
      .filter(agent => 
        agent.type === agentType && 
        agent.status !== 'offline' && 
        agent.currentTasks < 3
      );
  }

  async notifyUser(sessionId, notification) {
    await publishMessage(`session:${sessionId}`, {
      type: 'notification',
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  generateWorkflowTitle(intent, entities) {
    switch (intent) {
      case 'book_appointment':
        return `Book ${entities.service_type || 'appointment'}${entities.location ? ` in ${entities.location}` : ''}`;
      case 'find_restaurant':
        return `Find ${entities.cuisine_type || 'restaurant'}${entities.location ? ` in ${entities.location}` : ''}`;
      case 'make_reservation':
        return `Make restaurant reservation${entities.location ? ` in ${entities.location}` : ''}`;
      default:
        return `Process: ${intent}`;
    }
  }

  calculatePriority(intent, entities) {
    // Higher priority for time-sensitive requests
    if (entities.date_time && this.isUrgent(entities.date_time)) {
      return 9;
    }
    
    switch (intent) {
      case 'book_appointment':
      case 'make_reservation':
        return 7;
      case 'find_restaurant':
      case 'search_places':
        return 6;
      default:
        return 5;
    }
  }

  isUrgent(dateTime) {
    if (!dateTime) return false;
    
    const requestedTime = new Date(dateTime);
    const now = new Date();
    const timeDiff = requestedTime.getTime() - now.getTime();
    
    // Consider urgent if within next 4 hours
    return timeDiff > 0 && timeDiff < 4 * 60 * 60 * 1000;
  }

  mapServiceTypeToPlaceType(serviceType) {
    const mappings = {
      'doctor': 'doctor',
      'dentist': 'dentist',
      'healthcare': 'hospital',
      'beauty': 'beauty_salon',
      'hair': 'hair_care',
      'spa': 'spa',
      'gym': 'gym',
      'veterinarian': 'veterinary_care'
    };
    
    return mappings[serviceType?.toLowerCase()] || 'establishment';
  }

  startWorkflowMonitoring() {
    this.workflowMonitorInterval = setInterval(async () => {
      try {
        // Check for stuck workflows
        const stuckWorkflows = await Workflow.find({
          status: WORKFLOW_STATUS.RUNNING,
          startedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // 10 minutes ago
        });

        for (const workflow of stuckWorkflows) {
          logger.warn(`Stuck workflow detected: ${workflow.workflowId}`);
          // Handle stuck workflow - retry or fail
          await this.handleStuckWorkflow(workflow);
        }

        // Cleanup completed workflows from memory
        for (const [workflowId, workflow] of this.activeWorkflows) {
          if (workflow.status === WORKFLOW_STATUS.COMPLETED || 
              workflow.status === WORKFLOW_STATUS.FAILED) {
            this.activeWorkflows.delete(workflowId);
          }
        }

      } catch (error) {
        logger.error('Workflow monitoring error:', error);
      }
    }, 60000); // Every minute
  }

  startAgentRegistryUpdates() {
    // Listen for agent status updates
    subscribeToChannel(REDIS_CHANNELS.AGENTS, (message) => {
      if (message.type === 'status_update' || message.type === 'heartbeat') {
        this.agentRegistry.set(message.agentId, {
          id: message.agentId,
          type: message.agentType,
          status: message.status,
          currentTasks: message.currentTasks || 0,
          lastHeartbeat: message.timestamp
        });
      }
    });
  }

  async handleStuckWorkflow(workflow) {
    logger.info(`Handling stuck workflow: ${workflow.workflowId}`);
    
    try {
      // Try to recover workflow
      const pendingTasks = await Task.find({
        workflowId: workflow.workflowId,
        status: WORKFLOW_STATUS.RUNNING
      });

      for (const task of pendingTasks) {
        // Cancel stuck task and retry
        await task.cancel('Workflow recovery - task timeout');
        
        // Reassign if agent is still available
        if (this.getAvailableAgents(task.agentType).length > 0) {
          await task.retry();
          await this.assignTaskToAgent(task);
        }
      }

    } catch (error) {
      logger.error(`Failed to recover workflow ${workflow.workflowId}:`, error);
      await workflow.fail(new Error('Workflow recovery failed'));
    }
  }
}

export default OrchestratorAgent;