/**
 * WebSocket Hook - Fixed Authentication Handling
 * Current Time: 2025-06-20 09:46:40 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { WebSocketEvents } from "@/lib/websocket";
import { WS_EVENTS } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import wsClient from "@/lib/websocket/client";

interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  socketId?: string;
  isConnecting: boolean;
}

interface LastMessage {
  event: string;
  data: any;
  timestamp: string;
  currentUser: string;
}

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
  forceConnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<LastMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0,
    socketId: undefined,
    isConnecting: false,
  });

  const handlersRef = useRef<Map<string, Function>>(new Map());
  const connectionAttempted = useRef<boolean>(false);

  // Update connection status
  useEffect(() => {
    const updateStatus = () => {
      const status = wsClient.getConnectionStatus();
      const typedStatus: ConnectionStatus = {
        isConnected: Boolean(status.isConnected),
        reconnectAttempts: Number(status.reconnectAttempts || 0),
        socketId: status.socketId,
        isConnecting: Boolean(status.isConnecting),
      };

      setConnectionStatus(typedStatus);
      setIsConnected(typedStatus.isConnected);
    };

    // Initial status
    updateStatus();

    // Listen for connection changes
    const handleConnect = (data: any) => {
      updateStatus();
      console.log(
        "🔌 WebSocket connected at 2025-06-20 09:46:40 for ayush20244048:",
        data
      );
    };

    const handleDisconnect = (data: any) => {
      updateStatus();
      console.log(
        "🔌 WebSocket disconnected:",
        data.reason,
        "at 2025-06-20 09:46:40"
      );
    };

    const handleError = (error: any) => {
      console.error("🔌 WebSocket error at 2025-06-20 09:46:40:", error);
      updateStatus();
    };

    wsClient.on("connect", handleConnect);
    wsClient.on("disconnect", handleDisconnect);
    wsClient.on("error", handleError);

    // Store handlers for cleanup
    handlersRef.current.set("connect", handleConnect);
    handlersRef.current.set("disconnect", handleDisconnect);
    handlersRef.current.set("error", handleError);

    return () => {
      wsClient.off("connect", handleConnect);
      wsClient.off("disconnect", handleDisconnect);
      wsClient.off("error", handleError);
    };
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    console.log("🔐 Auth state changed at 2025-06-20 09:46:40:", {
      isAuthenticated,
      hasUser: !!user,
      username: user?.username,
      connectionAttempted: connectionAttempted.current,
    });

    if (!isAuthenticated || !user) {
      // User is not authenticated - disconnect if connected
      if (isConnected) {
        console.log("🚫 User not authenticated - disconnecting WebSocket");
        wsClient.disconnect();
      }
      connectionAttempted.current = false;
    } else {
      // User is authenticated - connect if not already connected
      if (!isConnected && !connectionAttempted.current) {
        console.log("✅ User authenticated - attempting WebSocket connection");
        connectionAttempted.current = true;

        // Small delay to ensure session is properly set
        setTimeout(async () => {
          try {
            await wsClient.connect();
          } catch (error) {
            console.error("❌ Initial WebSocket connection failed:", error);
            connectionAttempted.current = false;
          }
        }, 1000);
      }
    }
  }, [isAuthenticated, user, isConnected]);

  const sendMessage = useCallback(
    (event: string, data: any) => {
      if (!isAuthenticated) {
        console.warn(
          "⚠️ Cannot send WebSocket message - user not authenticated"
        );
        return;
      }

      wsClient.emit(event, {
        ...data,
        timestamp: "2025-06-20 09:46:40",
        currentUser: "ayush20244048",
        userId: user?._id || user?._id,
      });
    },
    [isAuthenticated, user]
  );

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
          timestamp: "2025-06-20 09:46:40",
          currentUser: "ayush20244048",
        };
        setLastMessage(lastMsg);
        handler(data);
      };

      wsClient.on(event as string, wrappedHandler);

      // Return unsubscribe function
      return () => {
        wsClient.off(event as string, wrappedHandler);
      };
    },
    []
  );

  const reconnect = useCallback(() => {
    if (!isAuthenticated) {
      console.warn("⚠️ Cannot reconnect WebSocket - user not authenticated");
      return;
    }

    console.log("🔄 Manually reconnecting WebSocket at 2025-06-20 09:46:40");
    wsClient.reconnect();
  }, [isAuthenticated]);

  const forceConnect = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn(
        "⚠️ Cannot force connect WebSocket - user not authenticated"
      );
      return;
    }

    console.log("🔧 Force connecting WebSocket at 2025-06-20 09:46:40");
    connectionAttempted.current = false;

    try {
      await wsClient.connect();
      connectionAttempted.current = true;
    } catch (error) {
      console.error("❌ Force connection failed:", error);
      connectionAttempted.current = false;
    }
  }, [isAuthenticated]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect,
    forceConnect,
  };
}

// Rest of the specialized hooks remain the same...
export function useChatMessages() {
  const { subscribe } = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe("message_received" as any, (data: any) => {
      const chatMessage = {
        messageId: data.messageId || `msg-${Date.now()}`,
        conversationId: data.conversationId || "",
        content: data.content || "",
        agent: data.agent,
        confidence: data.confidence,
        timestamp: data.timestamp || "2025-06-20 09:46:40",
        receivedAt: "2025-06-20 09:46:40",
        currentUser: "ayush20244048",
      };

      setMessages((prev) => [...prev, chatMessage]);
    });

    return unsubscribe;
  }, [subscribe]);

  return messages;
}

export function useTypingIndicator() {
  const { subscribe } = useWebSocket();
  const [typingStatus, setTypingStatus] = useState({
    isTyping: false,
  });

  useEffect(() => {
    const unsubscribeStart = subscribe("typing_start" as any, (data: any) => {
      setTypingStatus({
        isTyping: true,
        agent: data.agent,
        estimatedTime: data.estimatedTime,
      });
    });

    const unsubscribeStop = subscribe("typing_stop" as any, () => {
      setTypingStatus({ isTyping: false });
    });

    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }, [subscribe]);

  return typingStatus;
}

export function useConnectionManager() {
  const { isConnected, connectionStatus, reconnect, forceConnect } =
    useWebSocket();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = useCallback(async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    console.log(
      "🔄 Connection manager initiating reconnect at 2025-06-20 09:46:40"
    );

    try {
      await reconnect();
      setTimeout(() => {
        setIsReconnecting(false);
      }, 3000);
    } catch (error) {
      console.error("❌ Reconnection failed at 2025-06-20 09:46:40:", error);
      setIsReconnecting(false);
    }
  }, [reconnect, isReconnecting]);

  return {
    isConnected,
    connectionStatus,
    isReconnecting,
    reconnect: handleReconnect,
    forceConnect,
  };
}
