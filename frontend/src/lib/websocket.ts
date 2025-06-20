/**
 * WebSocket Types - Updated for Type Safety
 * Current Time: 2025-06-20 07:58:27 UTC
 * Current User: ayush20244048
 */

// WebSocket Event Data Types
export interface ChatMessageData {
  messageId: string;
  conversationId: string;
  content: string;
  agent?: string;
  confidence?: number;
  timestamp: string;
}

export interface TypingStartData {
  agent: string;
  estimatedTime?: number;
  conversationId?: string;
}

export interface TypingStopData {
  agent: string;
  conversationId?: string;
}

export interface WorkflowUpdateData {
  workflowId: string;
  type: string;
  status: string;
  step?: string;
  progress?: number;
  timestamp: string;
}

export interface SystemNotificationData {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "urgent";
  timestamp: string;
}

export interface AgentStatusData {
  agentId: string;
  status: "online" | "offline" | "busy" | "error";
  performance?: number;
  lastActivity?: string;
}

export interface CallStatusData {
  callId: string;
  status: "initiating" | "ringing" | "connected" | "completed" | "failed";
  duration?: number;
  phoneNumber?: string;
  businessName?: string;
}

// WebSocket Events Interface
export interface WebSocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: Error) => void;

  // Chat events
  message_received: (data: ChatMessageData) => void;
  typing_start: (data: TypingStartData) => void;
  typing_stop: (data: TypingStopData) => void;

  // Workflow events
  workflow_updated: (data: WorkflowUpdateData) => void;

  // System events
  system_notification: (data: SystemNotificationData) => void;
  agent_status_updated: (data: AgentStatusData) => void;
  call_status_updated: (data: CallStatusData) => void;

  // User events
  user_joined: (data: { userId: string; timestamp: string }) => void;
  user_left: (data: { userId: string; timestamp: string }) => void;
}

// Connection Status Interface
export interface WebSocketConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  socketId?: string;
  lastConnection?: string;
  error?: string;
}

// WebSocket Client Interface
export interface WebSocketClient {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  on<K extends keyof WebSocketEvents>(
    event: K,
    handler: WebSocketEvents[K]
  ): void;

  off<K extends keyof WebSocketEvents>(
    event: K,
    handler: WebSocketEvents[K]
  ): void;

  emit(event: string, data: any): void;

  getConnectionStatus(): WebSocketConnectionStatus;
}

// Export for use in hooks
export type { WebSocketEvents as default };
