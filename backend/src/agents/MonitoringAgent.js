/**
 * Monitoring Agent - System health and performance monitoring
 * Current Time: 2025-06-20 05:45:56 UTC
 * Current User: ayush20244048
 */

import { BaseAgent } from "./BaseAgent.js";
import { AGENT_TYPES, WORKFLOW_STATUS } from "../config/constants.js";
import { getRedisClient } from "../config/redis.js";
import { Workflow, Task, User, Session } from "../models/index.js";
import { logger } from "../utils/logger.js";

export class MonitoringAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      "system_monitoring",
      "performance_analysis",
      "health_checks",
      "metrics_collection",
      "alerting",
      "resource_tracking",
      "usage_analytics",
      "error_tracking",
    ];

    const systemPrompt = `
You are the Monitoring Agent, responsible for system health and performance oversight.

Current Time: 2025-06-20 05:45:56 UTC
Current User: ayush20244048

Your primary responsibilities:
1. Monitor system health and performance metrics
2. Track agent performance and availability
3. Analyze workflow success rates and bottlenecks
4. Collect and process usage analytics
5. Generate alerts for system issues
6. Provide performance recommendations
7. Monitor resource utilization
8. Track error rates and system reliability

Monitoring Areas:
- Agent Performance: Response times, success rates, availability
- Workflow Analytics: Completion rates, failure patterns, duration
- System Resources: Memory, CPU, database performance
- User Experience: Session duration, satisfaction indicators
- API Performance: Response times, error rates, throughput
- Business Metrics: Booking success rates, user engagement

Alert Conditions:
- Agent downtime or performance degradation
- High error rates or system failures
- Resource utilization thresholds
- Workflow completion rate drops
- Security or unusual activity patterns

When monitoring:
1. Collect metrics continuously and efficiently
2. Analyze trends and patterns over time
3. Identify performance bottlenecks and issues
4. Generate actionable insights and recommendations
5. Provide real-time status updates
6. Maintain historical performance data

Always prioritize:
- System reliability and uptime
- Early detection of issues
- Comprehensive performance visibility
- Actionable monitoring insights
- Efficient resource utilization

System Context:
- Build Time: 2025-06-20 05:45:56
- Environment: Production Ready v1.0.0
- Current User: ayush20244048
    `;

    super(AGENT_TYPES.MONITORING, capabilities, systemPrompt);

    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = {
      agent_response_time: 30000, // 30 seconds
      workflow_success_rate: 0.7, // 70%
      system_memory_usage: 0.85, // 85%
      error_rate: 0.1, // 10%
      concurrent_users: 1000,
    };

    this.redisClient = null;
    this.monitoringInterval = null;
    this.alertingEnabled = true;
    this.startTime = "2025-06-20 05:45:56";
    this.currentUser = "ayush20244048";
  }

  async initialize() {
    await super.initialize();

    try {
      // Initialize Redis client safely
      this.redisClient = getRedisClient();
      logger.info(
        `Monitoring Agent initializing at ${this.startTime} for user ${this.currentUser}`
      );
    } catch (error) {
      logger.warn("Redis client not available, using memory-only monitoring", {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }

    // Start continuous monitoring
    this.startContinuousMonitoring();

    // Start periodic cleanup
    this.startPeriodicCleanup();

    logger.info("Monitoring Agent initialized with continuous monitoring", {
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
    });
  }

  async executeTask(taskId, taskData) {
    logger.info(`Monitoring Agent executing task: ${taskId}`, {
      ...taskData,
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
    });

    try {
      switch (taskData.action) {
        case "collect_metrics":
          return await this.collectSystemMetrics(taskData);
        case "analyze_performance":
          return await this.analyzeSystemPerformance(taskData);
        case "generate_health_report":
          return await this.generateHealthReport(taskData);
        case "check_agent_status":
          return await this.checkAgentStatus(taskData);
        case "analyze_workflows":
          return await this.analyzeWorkflowPerformance(taskData);
        case "track_user_activity":
          return await this.trackUserActivity(taskData);
        case "generate_alerts":
          return await this.generateSystemAlerts(taskData);
        case "export_analytics":
          return await this.exportAnalytics(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(`Monitoring Agent task execution failed:`, error, {
        taskId,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      throw error;
    }
  }

  async collectSystemMetrics(taskData) {
    const { categories = ["all"], timeRange = "1h" } =
      taskData.parameters || taskData;

    logger.info("Collecting system metrics:", {
      categories,
      timeRange,
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
    });

    const metrics = {
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
      system: await this.collectSystemResourceMetrics(),
      agents: await this.collectAgentMetrics(),
      workflows: await this.collectWorkflowMetrics(timeRange),
      users: await this.collectUserMetrics(timeRange),
      database: await this.collectDatabaseMetrics(),
      api: await this.collectAPIMetrics(timeRange),
    };

    // Filter by requested categories
    if (!categories.includes("all")) {
      const filteredMetrics = {
        timestamp: metrics.timestamp,
        currentUser: metrics.currentUser,
      };
      categories.forEach((category) => {
        if (metrics[category]) {
          filteredMetrics[category] = metrics[category];
        }
      });
      return {
        success: true,
        result: filteredMetrics,
        metadata: {
          processingTime: Date.now(),
          categoriesRequested: categories,
          timeRange,
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        },
      };
    }

    // Store metrics for historical tracking
    await this.storeMetrics(metrics);

    return {
      success: true,
      result: metrics,
      metadata: {
        processingTime: Date.now(),
        categoriesCollected: Object.keys(metrics).length - 2, // Exclude timestamp and currentUser
        timeRange,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      },
    };
  }

  async collectSystemResourceMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        usage_percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        total: cpuUsage.user + cpuUsage.system,
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
    };
  }

  async collectAgentMetrics() {
    try {
      if (!this.redisClient) {
        return {
          total_agents: 0,
          active_agents: 0,
          agents: {},
          overall_health: 0,
          error: "Redis client not available",
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        };
      }

      const agentKeys = await this.redisClient.keys("agent:*:status");
      const agents = {};

      for (const key of agentKeys) {
        const agentId = key.split(":")[1];
        const status = await this.redisClient.hGetAll(key);
        const metrics = await this.redisClient.hGetAll(
          `agent:${agentId}:metrics`
        );

        agents[agentId] = {
          status: status.status || "unknown",
          last_heartbeat: status.lastHeartbeat,
          current_task: status.currentTask,
          uptime: status.startTime
            ? Date.now() - new Date(status.startTime).getTime()
            : 0,
          performance: {
            tasks_completed: parseInt(metrics.tasksCompleted) || 0,
            tasks_failed: parseInt(metrics.tasksFailed) || 0,
            average_response_time: parseInt(metrics.averageResponseTime) || 0,
            success_rate: this.calculateSuccessRate(
              parseInt(metrics.tasksCompleted) || 0,
              parseInt(metrics.tasksFailed) || 0
            ),
          },
        };
      }

      return {
        total_agents: Object.keys(agents).length,
        active_agents: Object.values(agents).filter(
          (a) => a.status === "active"
        ).length,
        agents: agents,
        overall_health: this.calculateOverallAgentHealth(agents),
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    } catch (error) {
      logger.error("Error collecting agent metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      return {
        total_agents: 0,
        active_agents: 0,
        agents: {},
        overall_health: 0,
        error: error.message,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    }
  }

  async collectWorkflowMetrics(timeRange) {
    try {
      const cutoffDate = this.getTimeRangeCutoff(timeRange);

      const workflows = await Workflow.find({
        createdAt: { $gte: cutoffDate },
      });

      const metrics = {
        total: workflows.length,
        by_status: {},
        by_type: {},
        average_duration: 0,
        success_rate: 0,
        failure_reasons: {},
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };

      // Group by status
      workflows.forEach((workflow) => {
        metrics.by_status[workflow.status] =
          (metrics.by_status[workflow.status] || 0) + 1;
        metrics.by_type[workflow.type] =
          (metrics.by_type[workflow.type] || 0) + 1;
      });

      // Calculate success rate
      const completed = workflows.filter(
        (w) => w.status === WORKFLOW_STATUS.COMPLETED
      );
      const failed = workflows.filter(
        (w) => w.status === WORKFLOW_STATUS.FAILED
      );

      metrics.success_rate =
        workflows.length > 0 ? completed.length / workflows.length : 0;

      // Calculate average duration for completed workflows
      const completedWithDuration = completed.filter((w) => w.actualDuration);
      if (completedWithDuration.length > 0) {
        metrics.average_duration =
          completedWithDuration.reduce((sum, w) => sum + w.actualDuration, 0) /
          completedWithDuration.length;
      }

      // Analyze failure reasons
      failed.forEach((workflow) => {
        if (workflow.result?.error?.message) {
          const reason = workflow.result.error.message;
          metrics.failure_reasons[reason] =
            (metrics.failure_reasons[reason] || 0) + 1;
        }
      });

      return metrics;
    } catch (error) {
      logger.error("Error collecting workflow metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      return {
        total: 0,
        by_status: {},
        by_type: {},
        average_duration: 0,
        success_rate: 0,
        failure_reasons: {},
        error: error.message,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    }
  }

  async collectUserMetrics(timeRange) {
    try {
      const cutoffDate = this.getTimeRangeCutoff(timeRange);

      const [totalUsers, activeSessions, newUsers] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Session.countDocuments({
          status: "active",
          lastActivityAt: { $gte: cutoffDate },
        }),
        User.countDocuments({
          createdAt: { $gte: cutoffDate },
        }),
      ]);

      const userActivity = await Session.aggregate([
        {
          $match: {
            lastActivityAt: { $gte: cutoffDate },
          },
        },
        {
          $group: {
            _id: null,
            average_session_duration: {
              $avg: {
                $subtract: ["$lastActivityAt", "$createdAt"],
              },
            },
            total_sessions: { $sum: 1 },
            total_conversations: { $sum: "$conversationCount" },
            total_workflows: { $sum: "$workflowCount" },
          },
        },
      ]);

      return {
        total_users: totalUsers,
        active_sessions: activeSessions,
        new_users: newUsers,
        activity: userActivity[0] || {
          average_session_duration: 0,
          total_sessions: 0,
          total_conversations: 0,
          total_workflows: 0,
        },
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    } catch (error) {
      logger.error("Error collecting user metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      return {
        total_users: 0,
        active_sessions: 0,
        new_users: 0,
        activity: {
          average_session_duration: 0,
          total_sessions: 0,
          total_conversations: 0,
          total_workflows: 0,
        },
        error: error.message,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    }
  }

  async collectDatabaseMetrics() {
    try {
      // Check if mongoose is connected
      const mongoose = await import("mongoose");
      const connection = mongoose.default.connection;

      if (!connection || connection.readyState !== 1) {
        return {
          connection_status: "disconnected",
          readyState: connection?.readyState || 0,
          error: "Database not connected",
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        };
      }

      const db = connection.db;
      if (!db) {
        return {
          connection_status: "connected_no_db",
          readyState: connection.readyState,
          host: connection.host,
          port: connection.port,
          name: connection.name,
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        };
      }

      const stats = await db.stats();

      return {
        connection_status: "connected",
        readyState: connection.readyState,
        host: connection.host,
        port: connection.port,
        name: connection.name,
        database_size: stats.dataSize || 0,
        storage_size: stats.storageSize || 0,
        index_size: stats.indexSize || 0,
        collections: stats.collections || 0,
        objects: stats.objects || 0,
        avg_obj_size: stats.avgObjSize || 0,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    } catch (error) {
      logger.error("Error collecting database metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      return {
        connection_status: "error",
        error: error.message,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    }
  }

  async collectAPIMetrics(timeRange) {
    try {
      if (!this.redisClient) {
        return {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          endpoints: {},
          error: "Redis client not available",
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        };
      }

      // Collect API metrics from Redis
      const apiKeys = await this.redisClient.keys("api:metrics:*");
      const metrics = {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        endpoints: {},
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };

      for (const key of apiKeys) {
        const endpointMetrics = await this.redisClient.hGetAll(key);
        const endpoint = key.split(":")[2];

        metrics.endpoints[endpoint] = {
          requests: parseInt(endpointMetrics.requests) || 0,
          errors: parseInt(endpointMetrics.errors) || 0,
          total_response_time: parseInt(endpointMetrics.totalResponseTime) || 0,
          average_response_time:
            endpointMetrics.requests > 0
              ? (parseInt(endpointMetrics.totalResponseTime) || 0) /
                (parseInt(endpointMetrics.requests) || 1)
              : 0,
        };

        metrics.total_requests += metrics.endpoints[endpoint].requests;
        metrics.failed_requests += metrics.endpoints[endpoint].errors;
      }

      metrics.successful_requests =
        metrics.total_requests - metrics.failed_requests;
      metrics.error_rate =
        metrics.total_requests > 0
          ? metrics.failed_requests / metrics.total_requests
          : 0;

      return metrics;
    } catch (error) {
      logger.error("Error collecting API metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        endpoints: {},
        error: error.message,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      };
    }
  }

  // Helper methods for monitoring operations
  startContinuousMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Collect basic metrics every minute
        const metrics = await this.collectSystemMetrics({
          parameters: { categories: ["system", "agents"], timeRange: "5m" },
        });

        // Check for threshold violations and generate alerts
        const alerts = this.checkThresholds(metrics.result);

        if (alerts.length > 0 && this.alertingEnabled) {
          await this.processAlerts(alerts);
        }

        // Store metrics for historical analysis
        await this.storeMetrics(metrics.result);
      } catch (error) {
        logger.error("Continuous monitoring error:", error, {
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        });
      }
    }, 60000); // Every minute

    logger.info("Continuous monitoring started", {
      timestamp: "2025-06-20 05:45:56",
      currentUser: "ayush20244048",
    });
  }

  startPeriodicCleanup() {
    // Clean up old metrics and logs every hour
    setInterval(async () => {
      try {
        await this.cleanupOldMetrics();
        await this.cleanupOldAlerts();
        logger.debug("Periodic cleanup completed", {
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        });
      } catch (error) {
        logger.error("Periodic cleanup error:", error, {
          timestamp: "2025-06-20 05:45:56",
          currentUser: "ayush20244048",
        });
      }
    }, 3600000); // Every hour
  }

  async storeMetrics(metrics) {
    try {
      const timestamp = Date.now();
      const metricsKey = `metrics:${timestamp}`;

      if (this.redisClient) {
        await this.redisClient.setEx(
          metricsKey,
          86400, // 24 hours TTL
          JSON.stringify(metrics)
        );
      }

      // Store in agent's local cache
      this.metrics.set(timestamp, metrics);

      // Limit local cache size
      if (this.metrics.size > 1000) {
        const oldestKey = Math.min(...this.metrics.keys());
        this.metrics.delete(oldestKey);
      }
    } catch (error) {
      logger.error("Error storing metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }
  }

  checkThresholds(metrics) {
    const alerts = [];

    // Memory usage threshold
    if (
      metrics.system?.memory?.usage_percentage >
      this.thresholds.system_memory_usage * 100
    ) {
      alerts.push({
        id: `memory_${Date.now()}`,
        type: "system_resource",
        severity: "warning",
        title: "High Memory Usage",
        message: `Memory usage is ${metrics.system.memory.usage_percentage.toFixed(
          1
        )}%`,
        threshold: this.thresholds.system_memory_usage * 100,
        current_value: metrics.system.memory.usage_percentage,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
        status: "active",
      });
    }

    // Workflow success rate threshold
    if (
      metrics.workflows?.success_rate < this.thresholds.workflow_success_rate
    ) {
      alerts.push({
        id: `workflow_success_${Date.now()}`,
        type: "workflow_performance",
        severity: "critical",
        title: "Low Workflow Success Rate",
        message: `Workflow success rate is ${(
          metrics.workflows.success_rate * 100
        ).toFixed(1)}%`,
        threshold: this.thresholds.workflow_success_rate * 100,
        current_value: metrics.workflows.success_rate * 100,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
        status: "active",
      });
    }

    return alerts;
  }

  async processAlerts(alerts) {
    for (const alert of alerts) {
      // Store alert
      this.alerts.set(alert.id, alert);

      // Log alert
      logger.warn(`System Alert: ${alert.title}`, {
        severity: alert.severity,
        message: alert.message,
        threshold: alert.threshold,
        currentValue: alert.current_value,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });

      // Send notification if critical
      if (alert.severity === "critical") {
        await this.sendCriticalAlert(alert);
      }
    }
  }

  async sendCriticalAlert(alert) {
    try {
      // In production, would send to monitoring systems, email, Slack, etc.
      logger.error(`CRITICAL ALERT: ${alert.title}`, {
        ...alert,
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });

      // Store in Redis for external monitoring systems
      if (this.redisClient) {
        await this.redisClient.setEx(
          `alert:critical:${alert.id}`,
          3600, // 1 hour TTL
          JSON.stringify(alert)
        );
      }
    } catch (error) {
      logger.error("Error sending critical alert:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }
  }

  async cleanupOldMetrics() {
    try {
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

      // Clean up Redis metrics
      if (this.redisClient) {
        const metricsKeys = await this.redisClient.keys("metrics:*");
        for (const key of metricsKeys) {
          const timestamp = parseInt(key.split(":")[1]);
          if (timestamp < cutoffTime) {
            await this.redisClient.del(key);
          }
        }
      }

      // Clean up local cache
      for (const [timestamp] of this.metrics) {
        if (timestamp < cutoffTime) {
          this.metrics.delete(timestamp);
        }
      }

      logger.debug("Old metrics cleaned up", {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    } catch (error) {
      logger.error("Error cleaning up old metrics:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }
  }

  async cleanupOldAlerts() {
    try {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

      // Clean up local alerts
      for (const [alertId, alert] of this.alerts) {
        const alertTime = new Date(alert.timestamp).getTime();
        if (alertTime < cutoffTime && alert.status === "resolved") {
          this.alerts.delete(alertId);
        }
      }

      // Clean up Redis alerts
      if (this.redisClient) {
        const alertKeys = await this.redisClient.keys("alert:*");
        for (const key of alertKeys) {
          const alert = await this.redisClient.get(key);
          if (alert) {
            const alertData = JSON.parse(alert);
            const alertTime = new Date(alertData.timestamp).getTime();
            if (alertTime < cutoffTime) {
              await this.redisClient.del(key);
            }
          }
        }
      }

      logger.debug("Old alerts cleaned up", {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    } catch (error) {
      logger.error("Error cleaning up old alerts:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }
  }

  // Utility methods
  getTimeRangeCutoff(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case "5m":
        return new Date(now.getTime() - 5 * 60 * 1000);
      case "1h":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  calculateSuccessRate(completed, failed) {
    const total = completed + failed;
    return total > 0 ? completed / total : 0;
  }

  calculateOverallAgentHealth(agents) {
    const agentArray = Object.values(agents);
    if (agentArray.length === 0) return 0;

    const healthScores = agentArray.map((agent) =>
      this.calculateAgentHealthScore(agent)
    );
    return (
      healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
    );
  }

  calculateAgentHealthScore(agent) {
    let score = 0;

    // Status score (40%)
    if (agent.status === "active") score += 40;
    else if (agent.status === "idle") score += 30;
    else if (agent.status === "working") score += 35;

    // Performance score (40%)
    if (agent.performance) {
      score += agent.performance.success_rate * 40;
    }

    // Response time score (20%)
    if (agent.performance?.average_response_time) {
      if (agent.performance.average_response_time < 1000) score += 20;
      else if (agent.performance.average_response_time < 5000) score += 15;
      else if (agent.performance.average_response_time < 10000) score += 10;
      else score += 5;
    }

    return Math.round(score);
  }

  async shutdown() {
    try {
      logger.info("Shutting down Monitoring Agent", {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });

      // Stop monitoring intervals
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      // Final cleanup
      await this.cleanupOldMetrics();
      await this.cleanupOldAlerts();

      // Call parent shutdown
      await super.shutdown();

      logger.info("Monitoring Agent shutdown complete", {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    } catch (error) {
      logger.error("Error during Monitoring Agent shutdown:", error, {
        timestamp: "2025-06-20 05:45:56",
        currentUser: "ayush20244048",
      });
    }
  }
}

export default MonitoringAgent;
