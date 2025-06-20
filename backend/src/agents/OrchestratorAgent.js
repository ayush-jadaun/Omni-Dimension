/**
 * Orchestrator Agent - Fixed Workflow Method Calls
 * Current Date and Time: 2025-06-20 12:07:37 UTC
 * Current User: ayush20244048
 */

import BaseAgent from "./BaseAgent.js";
import {
  AGENT_TYPES,
  WORKFLOW_STATUS,
  WORKFLOW_TYPES,
  REDIS_CHANNELS,
} from "../config/constants.js";
import { publishMessage } from "../config/redis.js";
import { Workflow, Task, User } from "../models/index.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import { subscribeToChannel } from "../config/redis.js";
import mongoose from "mongoose";

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      "workflow_management",
      "task_orchestration",
      "agent_coordination",
      "decision_making",
      "user_interaction",
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
Current Time: 2025-06-20 12:07:37 UTC
Current User: ayush20244048
    `;

    super(AGENT_TYPES.ORCHESTRATOR, capabilities, systemPrompt);

    this.activeWorkflows = new Map();
    this.agentRegistry = new Map();
    this.taskQueue = [];
    this.systemUserId = null;
    this.agentIds = new Map(); // Store agent ObjectIds
    this.initialize();
  }

  async initialize() {
    await super.initialize();

    // Initialize system user and agent IDs
    await this.initializeSystemData();

    // Start workflow monitoring
    this.startWorkflowMonitoring();

    // Start agent registry updates
    this.startAgentRegistryUpdates();

    logger.info(
      "✅ Orchestrator Agent initialized with enhanced capabilities at 2025-06-20 12:07:37",
      {
        currentUser: "ayush20244048",
        systemUserId: this.systemUserId,
      }
    );
  }

  /**
   * Initialize system user and agent IDs
   */
  async initializeSystemData() {
    try {
      console.log(
        "🔄 Initializing system data at 2025-06-20 12:07:37 for ayush20244048"
      );

      // Get or create system user
      await this.ensureSystemUser();

      // Initialize agent IDs
      await this.initializeAgentIds();

      logger.info(
        "✅ System data initialized successfully at 2025-06-20 12:07:37",
        {
          systemUserId: this.systemUserId,
          agentIds: Object.fromEntries(this.agentIds),
          currentUser: "ayush20244048",
        }
      );
    } catch (error) {
      logger.error(
        "❌ Failed to initialize system data at 2025-06-20 12:07:37:",
        error
      );
      throw error;
    }
  }

  /**
   * Ensure system user exists with proper ObjectId
   */
  async ensureSystemUser() {
    try {
      // Try to find existing system user
      let systemUser = await User.findOne({
        $or: [
          { username: "omnidimension-system" },
          { email: "system@omnidimension.ai" },
        ],
      });

      if (!systemUser) {
        console.log("🆕 Creating system user at 2025-06-20 12:07:37");

        systemUser = new User({
          username: "omnidimension-system",
          email: "system@omnidimension.ai",
          password: "system-generated-password-" + Date.now(),
          role: "system",
          isActive: true,
          profile: {
            firstName: "OmniDimension",
            lastName: "System",
            bio: "System user for internal operations and orchestration",
            createdAt: "2025-06-20 12:07:37",
          },
          preferences: {
            notifications: {
              email: false,
              push: false,
              sms: false,
            },
          },
          metadata: {
            createdBy: "orchestrator-agent",
            purpose: "system-operations",
            currentUser: "ayush20244048",
            timestamp: "2025-06-20 12:07:37",
          },
        });

        await systemUser.save();
        logger.info(
          "✅ System user created successfully at 2025-06-20 12:07:37:",
          {
            userId: systemUser._id,
            username: systemUser.username,
          }
        );
      } else {
        logger.info("✅ System user found at 2025-06-20 12:07:37:", {
          userId: systemUser._id,
          username: systemUser.username,
        });
      }

      this.systemUserId = systemUser._id;
    } catch (error) {
      logger.error(
        "❌ Failed to ensure system user at 2025-06-20 12:07:37:",
        error
      );

      // Fallback: create a consistent ObjectId for system operations
      this.systemUserId = new mongoose.Types.ObjectId(
        "507f1f77bcf86cd799439010"
      );
      logger.warn(
        "⚠️ Using fallback system user ID at 2025-06-20 12:07:37:",
        this.systemUserId
      );
    }
  }

  /**
   * Initialize agent ObjectIds for task assignment
   */
  async initializeAgentIds() {
    try {
      // Create consistent ObjectIds for each agent type
      const agentIdMappings = {
        nlp: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        search: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
        omnidimension: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
        monitoring: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
        orchestrator: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
      };

      for (const [agentType, agentId] of Object.entries(agentIdMappings)) {
        this.agentIds.set(agentType, agentId);
      }

      logger.info("✅ Agent IDs initialized at 2025-06-20 12:07:37:", {
        agentIds: Object.fromEntries(this.agentIds),
        currentUser: "ayush20244048",
      });
    } catch (error) {
      logger.error(
        "❌ Failed to initialize agent IDs at 2025-06-20 12:07:37:",
        error
      );
      throw error;
    }
  }

  async executeTask(taskId, taskData) {
    logger.info(`🚀 Orchestrator executing task at 2025-06-20 12:07:37:`, {
      taskId,
      action: taskData.action,
      currentUser: "ayush20244048",
    });

    try {
      // Ensure system data is initialized
      if (!this.systemUserId || this.agentIds.size === 0) {
        await this.initializeSystemData();
      }

      switch (taskData.action) {
        case "process_user_request":
          return await this.processUserRequest(taskData);
        case "create_workflow":
          return await this.createWorkflow(taskData);
        case "manage_workflow":
          return await this.manageWorkflow(taskData);
        case "coordinate_agents":
          return await this.coordinateAgents(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(
        `❌ Orchestrator task execution failed at 2025-06-20 12:07:37:`,
        error
      );
      throw error;
    }
  }

  async processUserRequest(taskData) {
    try {
      // FIXED: Better text extraction with multiple fallbacks
      const userMessage =
        taskData.userMessage ||
        taskData.text ||
        taskData.message ||
        taskData.content ||
        "";
      const sessionId = taskData.sessionId || "unknown-session";
      const userId = taskData.userId;
      const context = taskData.context || {};

      // DEBUGGING: Log all available fields
      logger.info(`🔍 Processing user request at 2025-06-20 12:16:14:`, {
        hasUserMessage: !!taskData.userMessage,
        hasText: !!taskData.text,
        hasMessage: !!taskData.message,
        hasContent: !!taskData.content,
        userMessageLength: userMessage?.length,
        userMessage: userMessage?.substring(0, 100),
        sessionId,
        userId: userId || "system",
        taskDataKeys: Object.keys(taskData),
        currentUser: "ayush20244048",
      });

      // FIXED: Validate we have actual text content
      if (
        !userMessage ||
        typeof userMessage !== "string" ||
        userMessage.trim().length === 0
      ) {
        logger.error(`❌ No valid message text found at 2025-06-20 12:16:14:`, {
          taskData: JSON.stringify(taskData, null, 2),
          userMessage,
          currentUser: "ayush20244048",
        });

        // Return a default response instead of throwing error
        return {
          success: true,
          workflow: "general_fallback",
          result: {
            type: "text_response",
            content:
              "I didn't receive your message properly. Could you please try sending it again?",
            intent: "error_recovery",
            confidence: 0.1,
          },
          timestamp: "2025-06-20 12:16:14",
          currentUser: "ayush20244048",
        };
      }

      // Validate and get proper user ID
      const validUserId = await this.getValidUserId(userId);

      logger.info(
        `📝 Valid message received at 2025-06-20 12:16:14: "${userMessage.substring(
          0,
          100
        )}..."`
      );

      // Step 1: Parse intent using NLP Agent with proper data structure
      const nlpTaskData = {
        action: "parse_intent",
        text: userMessage.trim(), // FIXED: Ensure text field is set
        userMessage: userMessage.trim(), // FIXED: Keep userMessage as backup
        message: userMessage.trim(), // FIXED: Add message as backup
        content: userMessage.trim(), // FIXED: Add content as backup
        context: context,
        userId: validUserId,
        sessionId: sessionId,
        timestamp: "2025-06-20 12:16:14",
        metadata: {
          source: "orchestrator",
          currentUser: "ayush20244048",
        },
      };

      logger.info(`🧠 Delegating to NLP agent at 2025-06-20 12:16:14:`, {
        action: nlpTaskData.action,
        hasText: !!nlpTaskData.text,
        textLength: nlpTaskData.text?.length,
        textPreview: nlpTaskData.text?.substring(0, 50),
        currentUser: "ayush20244048",
      });

      const intentAnalysis = await this.delegateToAgent("nlp", nlpTaskData);

      if (!intentAnalysis.success) {
        logger.error(
          `❌ Intent analysis failed at 2025-06-20 12:16:14:`,
          intentAnalysis
        );
        throw new Error(
          `Failed to parse user intent: ${
            intentAnalysis.error || "Unknown error"
          }`
        );
      }

      const { intent, entities, workflow_type, confidence } =
        intentAnalysis.result;

      logger.info("✅ Intent analysis completed at 2025-06-20 12:16:14:", {
        intent,
        workflow_type,
        confidence,
        entitiesCount: Object.keys(entities || {}).length,
      });

      // Step 2: Create appropriate workflow
      const workflowData = {
        type: workflow_type,
        title: this.generateWorkflowTitle(intent, entities),
        description: `User request: ${userMessage}`,
        intent: { name: intent, confidence, entities },
        sessionId,
        userId: validUserId,
        priority: this.calculatePriority(intent, entities),
        metadata: {
          originalMessage: userMessage,
          context,
          timestamp: "2025-06-20 12:16:14",
          currentUser: "ayush20244048",
        },
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
    } catch (error) {
      logger.error(
        `❌ Request processing failed at 2025-06-20 12:16:14:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get valid user ID (ObjectId) for task creation
   */
  async getValidUserId(userId) {
    try {
      // If no userId provided, use system user
      if (!userId) {
        return this.systemUserId;
      }

      // If userId is a string like "system", use system user
      if (
        typeof userId === "string" &&
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        logger.warn(
          `⚠️ Invalid userId "${userId}" at 2025-06-20 12:07:37, using system user`
        );
        return this.systemUserId;
      }

      // If it's a valid ObjectId string, convert it
      if (
        typeof userId === "string" &&
        mongoose.Types.ObjectId.isValid(userId)
      ) {
        return new mongoose.Types.ObjectId(userId);
      }

      // If it's already an ObjectId, return as is
      if (userId instanceof mongoose.Types.ObjectId) {
        return userId;
      }

      // Default to system user for any other case
      logger.warn(
        `⚠️ Unknown userId type "${typeof userId}" at 2025-06-20 12:07:37, using system user`
      );
      return this.systemUserId;
    } catch (error) {
      logger.error(`❌ Error validating userId at 2025-06-20 12:07:37:`, error);
      return this.systemUserId;
    }
  }

  /**
   * Get agent ID for task assignment
   */
  getAgentId(agentType) {
    const agentId = this.agentIds.get(agentType);
    if (!agentId) {
      logger.warn(
        `⚠️ No agent ID found for type "${agentType}" at 2025-06-20 12:07:37`
      );
      // Return a default ObjectId for unknown agent types
      return new mongoose.Types.ObjectId();
    }
    return agentId;
  }

  /**
   * Create workflow - FIXED: Return actual Mongoose document
   */
  async createWorkflow(workflowData) {
    try {
      const workflowId = `wf_${uuidv4()}`;

      // Ensure valid user ID
      const validUserId = await this.getValidUserId(workflowData.userId);

      logger.info(`📝 Creating workflow at 2025-06-20 12:07:37:`, {
        workflowId,
        type: workflowData.type,
        userId: validUserId,
        currentUser: "ayush20244048",
      });

      // Create Mongoose document (not plain object)
      const workflow = new Workflow({
        workflowId,
        sessionId: workflowData.sessionId,
        userId: validUserId,
        type: workflowData.type,
        title: workflowData.title,
        description: workflowData.description,
        intent: workflowData.intent,
        priority: workflowData.priority || 5,
        metadata: {
          ...workflowData.metadata,
          timestamp: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        },
      });

      // Save the workflow first
      await workflow.save();
      logger.info(
        `✅ Workflow document saved at 2025-06-20 12:07:37: ${workflowId}`
      );

      // Start the workflow (this calls the instance method)
      await workflow.start();
      logger.info(`✅ Workflow started at 2025-06-20 12:07:37: ${workflowId}`);

      // Store in active workflows
      this.activeWorkflows.set(workflowId, workflow);

      // Notify user
      await this.notifyUser(workflowData.sessionId, {
        type: "workflow_started",
        workflowId,
        message: `I'm working on your request: ${workflowData.title}`,
        status: "started",
        timestamp: "2025-06-20 12:07:37",
      });

      // Return the Mongoose document (has all the methods)
      return workflow;
    } catch (error) {
      logger.error(
        `❌ Failed to create workflow at 2025-06-20 12:07:37:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create and assign task - FIXED: Proper workflow method calls
   */
  async createAndAssignTask(workflow, taskData) {
    try {
      const taskId = `task_${uuidv4()}`;

      // Validate required data
      if (!taskData.agentType) {
        throw new Error("agentType is required for task creation");
      }

      // Ensure we have a proper Mongoose document
      if (typeof workflow.addStep !== "function") {
        logger.error(
          `❌ Invalid workflow object at 2025-06-20 12:07:37 - missing addStep method`,
          {
            workflowType: typeof workflow,
            hasAddStep: typeof workflow.addStep,
            workflowId: workflow.workflowId,
            currentUser: "ayush20244048",
          }
        );

        // Try to reload the workflow from database
        const reloadedWorkflow = await Workflow.findOne({
          workflowId: workflow.workflowId,
        });
        if (!reloadedWorkflow) {
          throw new Error(
            `Workflow ${workflow.workflowId} not found in database`
          );
        }
        workflow = reloadedWorkflow;
      }

      // Get valid user ID and agent ID
      const validUserId = await this.getValidUserId(workflow.userId);
      const validAgentId = this.getAgentId(taskData.agentType);

      logger.info(`📝 Creating task at 2025-06-20 12:07:37:`, {
        taskId,
        agentType: taskData.agentType,
        userId: validUserId,
        agentId: validAgentId,
        workflowId: workflow.workflowId,
        currentUser: "ayush20244048",
      });

      const task = new Task({
        taskId,
        workflowId: workflow.workflowId,
        sessionId: workflow.sessionId,
        userId: validUserId, // FIXED: Use valid ObjectId
        agentType: taskData.agentType,
        agentId: validAgentId, // FIXED: Provide required agentId as ObjectId
        name: taskData.name,
        description: taskData.description || taskData.name,
        input: {
          action: taskData.action,
          parameters: taskData.parameters || {},
          context: taskData.context || {},
        },
        dependencies: taskData.dependencies || [],
        priority: taskData.priority || workflow.priority,
        timeout: taskData.timeout || 60000,
        metadata: {
          ...taskData.metadata,
          createdAt: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        },
      });

      await task.save();
      logger.info(
        `✅ Task saved successfully at 2025-06-20 12:07:37: ${taskId}`
      );

      // Add step to workflow using the instance method
      await workflow.addStep({
        id: taskId,
        name: taskData.name,
        agentType: taskData.agentType,
        input: task.input,
        dependencies: task.dependencies,
      });
      logger.info(
        `✅ Step added to workflow at 2025-06-20 12:07:37: ${taskId}`
      );

      // Assign to agent
      await this.assignTaskToAgent(task);

      logger.info(
        `✅ Task created and assigned at 2025-06-20 12:07:37: ${taskId} to ${taskData.agentType} agent`
      );

      return task;
    } catch (error) {
      logger.error(
        `❌ Failed to create and assign task at 2025-06-20 12:07:37:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delegate to agent - FIXED: Handle workflow creation properly
   */
  async delegateToAgent(agentType, taskData) {
    try {
      logger.info(
        `🔄 Delegating to ${agentType} agent at 2025-06-20 12:07:37`,
        {
          agentType,
          action: taskData.action,
          currentUser: "ayush20244048",
        }
      );

      // Create a temporary workflow for direct delegation
      const tempWorkflowData = {
        type: WORKFLOW_TYPES.CUSTOM,
        title: `Direct delegation to ${agentType}`,
        description: `Direct task delegation: ${taskData.action}`,
        sessionId: taskData.sessionId || "orchestrator",
        userId: await this.getValidUserId(taskData.userId),
        priority: 8,
        metadata: {
          isDelegation: true,
          timestamp: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        },
      };

      // Create workflow using the proper method
      const tempWorkflow = await this.createWorkflow(tempWorkflowData);

      const task = await this.createAndAssignTask(tempWorkflow, {
        agentType,
        name: "direct_delegation",
        action: taskData.action,
        parameters: taskData,
        timeout: 30000,
        metadata: {
          isDelegation: true,
          timestamp: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        },
      });

      return await this.waitForTaskCompletion(task.taskId, 30000);
    } catch (error) {
      logger.error(
        `❌ Agent delegation failed for ${agentType} at 2025-06-20 12:07:37:`,
        error
      );
      throw error;
    }
  }

  async executeGeneralQueryWorkflow(workflow, entities) {
    logger.info(
      `💬 Executing general query workflow at 2025-06-20 12:07:37: ${workflow.workflowId}`
    );

    try {
      // Use NLP agent to generate response
      const responseTask = await this.createAndAssignTask(workflow, {
        agentType: "nlp",
        name: "generate_response",
        action: "text_generation",
        parameters: {
          prompt: workflow.metadata.originalMessage,
          context: entities,
          task: "general_query_response",
          timestamp: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        },
      });

      const responseResults = await this.waitForTaskCompletion(
        responseTask.taskId
      );

      if (responseResults.success) {
        await workflow.complete({
          response: responseResults.result,
          success: true,
          timestamp: "2025-06-20 12:07:37",
          currentUser: "ayush20244048",
        });

        await this.notifyUser(workflow.sessionId, {
          type: "workflow_completed",
          workflowId: workflow.workflowId,
          message: responseResults.result,
          result: { type: "text_response", content: responseResults.result },
          timestamp: "2025-06-20 12:07:37",
        });

        return {
          success: true,
          workflow: workflow.workflowId,
          result: responseResults.result,
          timestamp: "2025-06-20 12:07:37",
        };
      } else {
        throw new Error("Failed to generate response");
      }
    } catch (error) {
      logger.error(
        `❌ General query workflow failed at 2025-06-20 12:07:37:`,
        error
      );
      await workflow.fail(error);
      throw error;
    }
  }

  async assignTaskToAgent(task) {
    const availableAgents = this.getAvailableAgents(task.agentType);

    if (availableAgents.length === 0) {
      logger.warn(
        `⚠️ No available ${task.agentType} agents at 2025-06-20 12:07:37`
      );
      // Continue anyway - agent might come online
    }

    // Send task assignment
    await publishMessage(`agent:${task.agentType}`, {
      type: "task_assignment",
      taskId: task.taskId,
      taskData: {
        action: task.input.action,
        parameters: task.input.parameters,
        context: task.input.context,
      },
      workflowId: task.workflowId,
      sessionId: task.sessionId,
      priority: task.priority,
      from: this.id,
      timestamp: "2025-06-20 12:07:37",
      currentUser: "ayush20244048",
    });

    logger.debug(
      `✅ Task ${task.taskId} assigned to ${task.agentType} agent at 2025-06-20 12:07:37`
    );
  }

  async waitForTaskCompletion(taskId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      const checkCompletion = async () => {
        try {
          const task = await Task.findOne({ taskId });

          if (task && task.status === WORKFLOW_STATUS.COMPLETED) {
            clearTimeout(timer);
            resolve({
              success: true,
              result: task.output?.result || task.output,
              metadata: task.output?.metadata,
              timestamp: "2025-06-20 12:07:37",
            });
          } else if (task && task.status === WORKFLOW_STATUS.FAILED) {
            clearTimeout(timer);
            resolve({
              success: false,
              error: task.error,
              timestamp: "2025-06-20 12:07:37",
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

  getAvailableAgents(agentType) {
    return Array.from(this.agentRegistry.values()).filter(
      (agent) =>
        agent.type === agentType &&
        agent.status !== "offline" &&
        agent.currentTasks < 3
    );
  }

  async notifyUser(sessionId, notification) {
    try {
      await publishMessage(`session:${sessionId}`, {
        type: "notification",
        ...notification,
        timestamp: "2025-06-20 12:07:37",
        currentUser: "ayush20244048",
      });
    } catch (error) {
      logger.error(`❌ Failed to notify user at 2025-06-20 12:07:37:`, error);
    }
  }

  generateWorkflowTitle(intent, entities) {
    switch (intent) {
      case "book_appointment":
        return `Book ${entities.service_type || "appointment"}${
          entities.location ? ` in ${entities.location}` : ""
        }`;
      case "find_restaurant":
        return `Find ${entities.cuisine_type || "restaurant"}${
          entities.location ? ` in ${entities.location}` : ""
        }`;
      case "make_reservation":
        return `Make restaurant reservation${
          entities.location ? ` in ${entities.location}` : ""
        }`;
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
      case "book_appointment":
      case "make_reservation":
        return 7;
      case "find_restaurant":
      case "search_places":
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

  startWorkflowMonitoring() {
    this.workflowMonitorInterval = setInterval(async () => {
      try {
        // Check for stuck workflows
        const stuckWorkflows = await Workflow.find({
          status: WORKFLOW_STATUS.RUNNING,
          startedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }, // 10 minutes ago
        });

        for (const workflow of stuckWorkflows) {
          logger.warn(
            `⚠️ Stuck workflow detected at 2025-06-20 12:07:37: ${workflow.workflowId}`
          );
          await this.handleStuckWorkflow(workflow);
        }

        // Cleanup completed workflows from memory
        for (const [workflowId, workflow] of this.activeWorkflows) {
          if (
            workflow.status === WORKFLOW_STATUS.COMPLETED ||
            workflow.status === WORKFLOW_STATUS.FAILED
          ) {
            this.activeWorkflows.delete(workflowId);
          }
        }
      } catch (error) {
        logger.error(
          `❌ Workflow monitoring error at 2025-06-20 12:07:37:`,
          error
        );
      }
    }, 60000); // Every minute
  }

  startAgentRegistryUpdates() {
    // Listen for agent status updates
    subscribeToChannel(REDIS_CHANNELS.AGENTS, (message) => {
      if (message.type === "status_update" || message.type === "heartbeat") {
        this.agentRegistry.set(message.agentId, {
          id: message.agentId,
          type: message.agentType,
          status: message.status,
          currentTasks: message.currentTasks || 0,
          lastHeartbeat: message.timestamp,
        });
      }
    });
  }

  async handleStuckWorkflow(workflow) {
    logger.info(
      `🔧 Handling stuck workflow at 2025-06-20 12:07:37: ${workflow.workflowId}`
    );

    try {
      // Try to recover workflow
      const pendingTasks = await Task.find({
        workflowId: workflow.workflowId,
        status: WORKFLOW_STATUS.RUNNING,
      });

      for (const task of pendingTasks) {
        // Cancel stuck task and retry
        await task.cancel("Workflow recovery - task timeout");

        // Reassign if agent is still available
        if (this.getAvailableAgents(task.agentType).length > 0) {
          await task.retry();
          await this.assignTaskToAgent(task);
        }
      }
    } catch (error) {
      logger.error(
        `❌ Failed to recover workflow ${workflow.workflowId} at 2025-06-20 12:07:37:`,
        error
      );
      await workflow.fail(new Error("Workflow recovery failed"));
    }
  }
}

export default OrchestratorAgent;
