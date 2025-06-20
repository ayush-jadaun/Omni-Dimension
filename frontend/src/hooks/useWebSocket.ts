/**
 * WebSocket Hook - Fixed TypeScript Errors
 * Current Time: 2025-06-20 07:58:27 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { WebSocketEvents } from "@/lib/websocket";
import { WS_EVENTS } from "@/lib/config";
import { useAuth } from "./useAuth";
import wsClient from "@/lib/websocket/client";

// Define proper connection status interface
interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  socketId?: string;
}

// Define proper last message interface
interface LastMessage {
  event: string;
  data: any;
  timestamp: string;
  currentUser: string;
}

// Define return type for the main hook
interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastMessage: LastMessage | null;
  sendMessage: (event: string, data: any) => void;
  subscribe: <K extends keyof WebSocketEvents>(
    event: K,
    handler: (data: Parameters<WebSocketEvents[K]>[0]) => void
  ) => () => void;
  reconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<LastMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0,
    socketId: undefined,
  });

  const handlersRef = useRef<Map<string, Function>>(new Map());

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      const status = wsClient.getConnectionStatus();
      // Ensure the status matches our interface
      const typedStatus: ConnectionStatus = {
        isConnected: Boolean(status.isConnected),
        reconnectAttempts: Number(status.reconnectAttempts || 0),
        socketId: status.socketId,
      };

      setConnectionStatus(typedStatus);
      setIsConnected(typedStatus.isConnected);
    };

    // Initial status
    updateStatus();

    // Listen for connection changes
    const handleConnect = () => {
      updateStatus();
      console.log(
        "🔌 WebSocket connected at 2025-06-20 07:58:27 for ayush20244048"
      );
    };

    const handleDisconnect = (reason: string) => {
      updateStatus();
      console.log(
        "🔌 WebSocket disconnected:",
        reason,
        "at 2025-06-20 07:58:27"
      );
    };

    const handleError = (error: Error) => {
      console.error("🔌 WebSocket error at 2025-06-20 07:58:27:", error);
      updateStatus();
    };

    wsClient.on(WS_EVENTS.CONNECT, handleConnect);
    wsClient.on(WS_EVENTS.DISCONNECT, handleDisconnect);
    wsClient.on(WS_EVENTS.ERROR, handleError);

    // Store handlers for cleanup
    handlersRef.current.set("connect", handleConnect);
    handlersRef.current.set("disconnect", handleDisconnect);
    handlersRef.current.set("error", handleError);

    return () => {
      wsClient.off(WS_EVENTS.CONNECT, handleConnect);
      wsClient.off(WS_EVENTS.DISCONNECT, handleDisconnect);
      wsClient.off(WS_EVENTS.ERROR, handleError);
    };
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect();
    } else {
      // Reconnect if not connected and user is authenticated
      if (!isConnected) {
        wsClient.reconnect();
      }
    }
  }, [isAuthenticated, isConnected]);

  const sendMessage = useCallback((event: string, data: any) => {
    wsClient.emit(event, {
      ...data,
      timestamp: "2025-06-20 07:58:27",
      currentUser: "ayush20244048",
    });
  }, []);

  const subscribe = useCallback(
    <K extends keyof WebSocketEvents>(
      event: K,
      handler: (data: Parameters<WebSocketEvents[K]>[0]) => void
    ) => {
      // Wrapper to capture last message with proper typing
      const wrappedHandler = (data: Parameters<WebSocketEvents[K]>[0]) => {
        const lastMsg: LastMessage = {
          event: event as string,
          data,
          timestamp: "2025-06-20 07:58:27",
          currentUser: "ayush20244048",
        };
        setLastMessage(lastMsg);
        handler(data);
      };

      wsClient.on(event, wrappedHandler);

      // Return unsubscribe function
      return () => {
        wsClient.off(event, wrappedHandler);
      };
    },
    []
  );

  const reconnect = useCallback(() => {
    console.log("🔄 Manually reconnecting WebSocket at 2025-06-20 07:58:27");
    wsClient.reconnect();
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect,
  };
}

// Define proper message interface for chat messages
interface ChatMessage {
  messageId: string;
  conversationId: string;
  content: string;
  agent?: string;
  confidence?: number;
  timestamp: string;
  receivedAt: string;
  currentUser: string;
}

// Specialized hooks for specific WebSocket events
export function useChatMessages(): ChatMessage[] {
  const { subscribe } = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(WS_EVENTS.MESSAGE_RECEIVED, (data: any) => {
      const chatMessage: ChatMessage = {
        messageId: data.messageId || `msg-${Date.now()}`,
        conversationId: data.conversationId || "",
        content: data.content || "",
        agent: data.agent,
        confidence: data.confidence,
        timestamp: data.timestamp || "2025-06-20 07:58:27",
        receivedAt: "2025-06-20 07:58:27",
        currentUser: "ayush20244048",
      };

      setMessages((prev) => [...prev, chatMessage]);
    });

    return unsubscribe;
  }, [subscribe]);

  return messages;
}

// Define proper typing indicator interface
interface TypingIndicator {
  isTyping: boolean;
  agent?: string;
  estimatedTime?: number;
}

export function useTypingIndicator(): TypingIndicator {
  const { subscribe } = useWebSocket();
  const [typingStatus, setTypingStatus] = useState<TypingIndicator>({
    isTyping: false,
  });

  useEffect(() => {
    const unsubscribeStart = subscribe(WS_EVENTS.TYPING_START, (data: any) => {
      setTypingStatus({
        isTyping: true,
        agent: data.agent,
        estimatedTime: data.estimatedTime,
      });
    });

    const unsubscribeStop = subscribe(WS_EVENTS.TYPING_STOP, () => {
      setTypingStatus({ isTyping: false });
    });

    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }, [subscribe]);

  return typingStatus;
}

// Define proper workflow update interface
interface WorkflowUpdate {
  workflowId: string;
  type: string;
  status: string;
  step?: string;
  progress?: number;
  timestamp: string;
  receivedAt: string;
  currentUser: string;
}

export function useWorkflowUpdates(): WorkflowUpdate[] {
  const { subscribe } = useWebSocket();
  const [workflowUpdates, setWorkflowUpdates] = useState<WorkflowUpdate[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(WS_EVENTS.WORKFLOW_UPDATED, (data: any) => {
      const workflowUpdate: WorkflowUpdate = {
        workflowId: data.workflowId || `workflow-${Date.now()}`,
        type: data.type || "unknown",
        status: data.status || "pending",
        step: data.step,
        progress: data.progress,
        timestamp: data.timestamp || "2025-06-20 07:58:27",
        receivedAt: "2025-06-20 07:58:27",
        currentUser: "ayush20244048",
      };

      setWorkflowUpdates((prev) => [...prev, workflowUpdate]);
    });

    return unsubscribe;
  }, [subscribe]);

  return workflowUpdates;
}

// Define proper system notification interface
interface SystemNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "urgent";
  timestamp: string;
  receivedAt: string;
  currentUser: string;
  read: boolean;
}

export function useSystemNotifications(): SystemNotification[] {
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(
      WS_EVENTS.SYSTEM_NOTIFICATION,
      (data: any) => {
        const notification: SystemNotification = {
          id: data.id || `notif-${Date.now()}`,
          type: data.type || "info",
          title: data.title || "System Notification",
          message: data.message || "",
          priority: data.priority || "normal",
          timestamp: data.timestamp || "2025-06-20 07:58:27",
          receivedAt: "2025-06-20 07:58:27",
          currentUser: "ayush20244048",
          read: false,
        };

        setNotifications((prev) => [...prev, notification]);
      }
    );

    return unsubscribe;
  }, [subscribe]);

  return notifications;
}

// Additional utility hooks
export function useAgentStatus() {
  const { subscribe } = useWebSocket();
  const [agentStatus, setAgentStatus] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = subscribe(
      WS_EVENTS.AGENT_STATUS_UPDATED,
      (data: any) => {
        setAgentStatus((prev) => ({
          ...prev,
          [data.agentId || "unknown"]: {
            ...data,
            lastUpdate: "2025-06-20 07:58:27",
            currentUser: "ayush20244048",
          },
        }));
      }
    );

    return unsubscribe;
  }, [subscribe]);

  return agentStatus;
}

export function useCallStatus() {
  const { subscribe } = useWebSocket();
  const [callStatus, setCallStatus] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = subscribe(
      WS_EVENTS.AGENT_STATUS_UPDATED,
      (data: any) => {
        setCallStatus({
          ...data,
          lastUpdate: "2025-06-20 07:58:27",
          currentUser: "ayush20244048",
        });
      }
    );

    return unsubscribe;
  }, [subscribe]);

  return callStatus;
}

// Connection management hook
export function useConnectionManager() {
  const { isConnected, connectionStatus, reconnect } = useWebSocket();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = useCallback(async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    console.log(
      "🔄 Connection manager initiating reconnect at 2025-06-20 07:58:27"
    );

    try {
      await reconnect();
      // Wait a bit to see if connection is established
      setTimeout(() => {
        setIsReconnecting(false);
      }, 3000);
    } catch (error) {
      console.error("❌ Reconnection failed at 2025-06-20 07:58:27:", error);
      setIsReconnecting(false);
    }
  }, [reconnect, isReconnecting]);

  return {
    isConnected,
    connectionStatus,
    isReconnecting,
    reconnect: handleReconnect,
  };
}
