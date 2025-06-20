import { Tool } from '@langchain/core/tools';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export class MonitoringTool extends Tool {
  constructor() {
    super();
    this.name = 'monitoring_metrics';
    this.description = `
      Use this tool to collect and analyze system metrics and performance data.
      
      Input should be a JSON string with:
      {
        "action": "get_metrics|track_event|get_agent_status|analyze_performance",
        "parameters": {
          "timeRange": "1h|24h|7d|30d",
          "agentType": "nlp|search|omnidimension|orchestrator",
          "eventType": "workflow_started|task_completed|error_occurred",
          "eventData": {}
        }
      }
    `;
    this.redisClient = getRedisClient();
  }

  async _call(input) {
    try {
      const { action, parameters = {} } = JSON.parse(input);

      let result;
      switch (action) {
        case 'get_metrics':
          result = await this.getMetrics(parameters);
          break;
        case 'track_event':
          result = await this.trackEvent(parameters);
          break;
        case 'get_agent_status':
          result = await this.getAgentStatus(parameters);
          break;
        case 'analyze_performance':
          result = await this.analyzePerformance(parameters);
          break;
        default:
          throw new Error(`Unknown monitoring action: ${action}`);
      }

      return JSON.stringify({
        success: true,
        action,
        result,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Monitoring tool error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getMetrics(parameters) {
    const { timeRange = '1h', agentType } = parameters;
    
    try {
      // Get metrics from Redis
      const metricsPattern = agentType 
        ? `metrics:${agentType}:*`
        : 'metrics:*';
      
      const keys = await this.redisClient.keys(metricsPattern);
      const metrics = [];

      for (const key of keys.slice(-100)) { // Limit to last 100 entries
        const data = await this.redisClient.get(key);
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }

      // Filter by time range
      const cutoffTime = this.getTimeRangeCutoff(timeRange);
      const filteredMetrics = metrics.filter(metric => 
        new Date(metric.timestamp) > cutoffTime
      );

      return {
        timeRange,
        agentType: agentType || 'all',
        metricsCount: filteredMetrics.length,
        metrics: filteredMetrics,
        summary: this.summarizeMetrics(filteredMetrics)
      };

    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async trackEvent(parameters) {
    const { eventType, eventData = {} } = parameters;
    
    try {
      const event = {
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Store event in Redis
      const key = `event:${eventType}:${Date.now()}`;
      await this.redisClient.setEx(key, 86400, JSON.stringify(event)); // Expire after 24 hours

      // Update counters
      const counterKey = `counter:${eventType}:${new Date().toISOString().split('T')[0]}`;
      await this.redisClient.incr(counterKey);
      await this.redisClient.expire(counterKey, 86400 * 7); // Keep for 7 days

      logger.debug('Event tracked:', { eventType, eventId: event.id });

      return {
        eventId: event.id,
        eventType,
        tracked: true,
        timestamp: event.timestamp
      };

    } catch (error) {
      logger.error('Error tracking event:', error);
      throw error;
    }
  }

  async getAgentStatus(parameters) {
    const { agentType } = parameters;
    
    try {
      const agents = agentType ? [agentType] : ['orchestrator', 'nlp', 'search', 'omnidimension', 'monitoring'];
      const statuses = {};

      for (const agent of agents) {
        const statusKey = `agent:${agent}:status`;
        const metricsKey = `agent:${agent}:metrics`;
        
        const status = await this.redisClient.hGetAll(statusKey);
        const metrics = await this.redisClient.hGetAll(metricsKey);

        statuses[agent] = {
          status: status.status || 'unknown',
          lastHeartbeat: status.lastHeartbeat,
          currentTask: status.currentTask,
          tasksCompleted: parseInt(metrics.tasksCompleted) || 0,
          tasksFailed: parseInt(metrics.tasksFailed) || 0,
          averageResponseTime: parseInt(metrics.averageResponseTime) || 0,
          uptime: status.startTime ? Date.now() - new Date(status.startTime).getTime() : 0
        };
      }

      return {
        agents: statuses,
        healthScore: this.calculateHealthScore(statuses),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting agent status:', error);
      throw error;
    }
  }

  async analyzePerformance(parameters) {
    const { timeRange = '24h' } = parameters;
    
    try {
      const metrics = await this.getMetrics({ timeRange });
      const events = await this.getRecentEvents(timeRange);

      const analysis = {
        timeRange,
        summary: {
          totalWorkflows: events.workflow_started?.length || 0,
          completedWorkflows: events.workflow_completed?.length || 0,
          failedWorkflows: events.workflow_failed?.length || 0,
          averageResponseTime: this.calculateAverageResponseTime(metrics.metrics),
          systemLoad: this.calculateSystemLoad(metrics.metrics),
          errorRate: this.calculateErrorRate(events)
        },
        recommendations: [],
        trends: this.analyzeTrends(metrics.metrics)
      };

      // Generate recommendations
      if (analysis.summary.errorRate > 0.1) {
        analysis.recommendations.push({
          type: 'error_rate',
          priority: 'high',
          message: 'High error rate detected. Review failed workflows and system logs.'
        });
      }

      if (analysis.summary.averageResponseTime > 10000) {
        analysis.recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: 'Average response time is high. Consider optimizing workflows.'
        });
      }

      return analysis;

    } catch (error) {
      logger.error('Error analyzing performance:', error);
      throw error;
    }
  }

  getTimeRangeCutoff(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  summarizeMetrics(metrics) {
    if (metrics.length === 0) return {};

    const summary = {
      totalDataPoints: metrics.length,
      timespan: {
        start: metrics[0]?.timestamp,
        end: metrics[metrics.length - 1]?.timestamp
      },
      averages: {}
    };

    // Calculate averages for numeric fields
    const numericFields = ['responseTime', 'memoryUsage', 'cpuUsage', 'activeConnections'];
    numericFields.forEach(field => {
      const values = metrics.map(m => m[field]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        summary.averages[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return summary;
  }

  calculateHealthScore(statuses) {
    const agents = Object.values(statuses);
    if (agents.length === 0) return 0;

    let totalScore = 0;
    agents.forEach(agent => {
      let score = 0;
      
      // Status score (40%)
      if (agent.status === 'active') score += 40;
      else if (agent.status === 'idle') score += 30;
      else if (agent.status === 'working') score += 35;
      
      // Success rate score (30%)
      const total = agent.tasksCompleted + agent.tasksFailed;
      if (total > 0) {
        const successRate = agent.tasksCompleted / total;
        score += successRate * 30;
      }
      
      // Response time score (20%)
      if (agent.averageResponseTime < 1000) score += 20;
      else if (agent.averageResponseTime < 5000) score += 15;
      else if (agent.averageResponseTime < 10000) score += 10;
      
      // Heartbeat score (10%)
      const lastHeartbeat = agent.lastHeartbeat ? new Date(agent.lastHeartbeat) : null;
      if (lastHeartbeat && (Date.now() - lastHeartbeat.getTime()) < 60000) {
        score += 10;
      }
      
      totalScore += score;
    });

    return Math.round(totalScore / agents.length);
  }

  async getRecentEvents(timeRange) {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const eventTypes = ['workflow_started', 'workflow_completed', 'workflow_failed', 'task_completed', 'error_occurred'];
    const events = {};

    for (const eventType of eventTypes) {
      const keys = await this.redisClient.keys(`event:${eventType}:*`);
      events[eventType] = [];

      for (const key of keys) {
        const eventData = await this.redisClient.get(key);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (new Date(event.timestamp) > cutoffTime) {
            events[eventType].push(event);
          }
        }
      }
    }

    return events;
  }

  calculateAverageResponseTime(metrics) {
    const responseTimes = metrics
      .map(m => m.responseTime)
      .filter(rt => typeof rt === 'number');
    
    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
  }

  calculateSystemLoad(metrics) {
    const loads = metrics
      .map(m => m.systemLoad || m.cpuUsage)
      .filter(load => typeof load === 'number');
    
    if (loads.length === 0) return 0;
    return loads.reduce((sum, load) => sum + load, 0) / loads.length;
  }

  calculateErrorRate(events) {
    const total = (events.workflow_started?.length || 0);
    const failed = (events.workflow_failed?.length || 0) + (events.error_occurred?.length || 0);
    
    if (total === 0) return 0;
    return failed / total;
  }

  analyzeTrends(metrics) {
    if (metrics.length < 2) return { trend: 'insufficient_data' };

    const recent = metrics.slice(-10);
    const earlier = metrics.slice(-20, -10);

    if (earlier.length === 0) return { trend: 'insufficient_data' };

    const recentAvg = recent.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + (m.responseTime || 0), 0) / earlier.length;

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    return {
      trend: change > 10 ? 'degrading' : change < -10 ? 'improving' : 'stable',
      changePercent: Math.round(change),
      recentAverage: Math.round(recentAvg),
      previousAverage: Math.round(earlierAvg)
    };
  }
}

export default MonitoringTool;