/**
 * Agent System Types
 * Current Time: 2025-06-20 07:26:28 UTC
 * Current User: ayush20244048
 */

export interface Agent {
  id: string;
  type: "orchestrator" | "nlp" | "search" | "omnidimension" | "monitoring";
  name: string;
  status: "active" | "idle" | "busy" | "error" | "offline";
  version: string;
  uptime: number;
  lastHeartbeat: string;
  capabilities: string[];
  currentTasks: string[];
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  successRate: number;
  memoryUsage: number;
  cpuUsage: number;
  queueLength: number;
  metadata: {
    description: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
    configuration: Record<string, any>;
    environment: "development" | "staging" | "production";
  };
  metrics: {
    requestsPerMinute: number;
    averageLatency: number;
    errorRate: number;
    throughput: number;
    availability: number;
  };
}

export interface AgentTask {
  taskId: string;
  agentId: string;
  agentType: string;
  type: "task_assignment" | "workflow_step" | "health_check" | "monitoring";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: number;
  taskData: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  retryCount: number;
  metadata: {
    workflowId?: string;
    sessionId?: string;
    userId?: string;
    context: Record<string, any>;
    currentUser: string;
  };
}

export interface AgentCommunication {
  messageId: string;
  from: string;
  to: string;
  type: "request" | "response" | "notification" | "broadcast";
  payload: Record<string, any>;
  timestamp: string;
  status: "sent" | "received" | "processed" | "failed";
  correlation_id?: string;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  agents: {
    [agentType: string]: {
      status: string;
      health: "healthy" | "degraded" | "critical";
      responseTime: number;
      errorRate: number;
    };
  };
  services: {
    database: "connected" | "disconnected" | "error";
    redis: "connected" | "disconnected" | "error";
    websocket: "active" | "inactive" | "error";
  };
  performance: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
  timestamp: string;
  currentUser: string;
}
