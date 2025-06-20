/**
 * WebSocket Client Implementation - Fixed
 * Current Time: 2025-06-20 08:52:17 UTC
 * Current User: ayush20244048
 */

import { io, Socket } from "socket.io-client";

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

class WSClient implements WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManuallyDisconnected = false;
  private connectionStatus: WebSocketConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0,
  };

  constructor() {
    console.log(
      "🔧 WSClient initialized at 2025-06-20 08:52:17 for ayush20244048"
    );
  }

  private initializeSocket() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";

    console.log(
      "🔌 Initializing WebSocket connection to:",
      wsUrl,
      "at 2025-06-20 08:52:17"
    );

    this.socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      autoConnect: false,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.connectionStatus = {
        isConnected: true,
        reconnectAttempts: this.reconnectAttempts,
        socketId: this.socket?.id,
        lastConnection: "2025-06-20 08:52:17",
      };
      console.log(
        "🔌 WebSocket connected at 2025-06-20 08:52:17 for ayush20244048"
      );
    });

    this.socket.on("disconnect", (reason) => {
      this.connectionStatus = {
        isConnected: false,
        reconnectAttempts: this.reconnectAttempts,
        socketId: undefined,
        error: reason,
      };
      console.log("🔌 WebSocket disconnected at 2025-06-20 08:52:17:", reason);

      if (
        !this.isManuallyDisconnected &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        setTimeout(() => {
          this.reconnect();
        }, this.reconnectDelay);
      }
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      this.connectionStatus = {
        isConnected: false,
        reconnectAttempts: this.reconnectAttempts,
        error: error.message,
      };
      console.error(
        "❌ WebSocket connection error at 2025-06-20 08:52:17:",
        error
      );
    });
  }

  async connect(): Promise<void> {
    if (!this.socket) {
      this.initializeSocket();
    }

    this.isManuallyDisconnected = false;

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      this.socket.connect();

      this.socket.once("connect", () => {
        console.log(
          "✅ WebSocket connection established at 2025-06-20 08:52:17"
        );
        resolve();
      });

      this.socket.once("connect_error", (error) => {
        console.error(
          "❌ WebSocket connection failed at 2025-06-20 08:52:17:",
          error
        );
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);
    });
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;

    if (this.socket) {
      this.socket.disconnect();
      this.connectionStatus = {
        isConnected: false,
        reconnectAttempts: this.reconnectAttempts,
      };
      console.log("🔌 WebSocket manually disconnected at 2025-06-20 08:52:17");
    }
  }

  async reconnect(): Promise<void> {
    console.log(
      `🔄 WebSocket reconnection attempt ${
        this.reconnectAttempts + 1
      } at 2025-06-20 08:52:17`
    );

    this.disconnect();

    // Wait a bit before reconnecting
    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    return this.connect();
  }

  on<K extends keyof WebSocketEvents>(
    event: K,
    handler: WebSocketEvents[K]
  ): void {
    if (this.socket) {
      this.socket.on(event as string, handler as any);
    } else {
      console.warn(
        "⚠️ Attempting to listen to events before socket initialization"
      );
    }
  }

  off<K extends keyof WebSocketEvents>(
    event: K,
    handler: WebSocketEvents[K]
  ): void {
    if (this.socket) {
      this.socket.off(event as string, handler as any);
    }
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, {
        ...data,
        timestamp: "2025-06-20 08:52:17",
        currentUser: "ayush20244048",
      });
    } else {
      console.warn(
        "⚠️ Cannot emit event - WebSocket not connected at 2025-06-20 08:52:17"
      );
    }
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return {
      ...this.connectionStatus,
      isConnected: this.socket?.connected || false,
    };
  }
}

// Create singleton instance
export const wsClient = new WSClient();

// Export for compatibility
export default wsClient;
