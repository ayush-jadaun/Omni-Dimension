/**
 * WebSocket Client - Using Native WebSocket (not Socket.IO)
 * Current Time: 2025-06-20 09:52:08 UTC
 * Current User: ayush20244048
 */

class WebSocketClient {
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventHandlers: Map<string, Function[]> = new Map();
  private connectionQueue: Promise<void> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionQueue) {
      return this.connectionQueue;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.connectionQueue = this._doConnect();

    try {
      await this.connectionQueue;
    } finally {
      this.connectionQueue = null;
    }
  }

  private async _doConnect(): Promise<void> {
    try {
      this.isConnecting = true;
      console.log(
        "🔌 Connecting to WebSocket at 2025-06-20 09:52:08 for ayush20244048"
      );

      // Get session ID from multiple sources
      const sessionId = this.getSessionId();
      if (!sessionId) {
        console.warn(
          "⚠️ No session ID found for WebSocket connection at 2025-06-20 09:52:08"
        );

        // Check if we're in a browser environment and user might not be logged in
        if (typeof window !== "undefined") {
          const userData =
            localStorage.getItem("auth_user") || localStorage.getItem("user");
          if (!userData) {
            console.log(
              "📝 User not logged in - WebSocket will connect when user logs in"
            );
            throw new Error("User not authenticated - please log in first");
          }
        }

        throw new Error("No session ID available");
      }

      console.log(
        "🔑 Session ID found for WebSocket:",
        sessionId.substring(0, 10) + "..."
      );

      // Connect to your WebSocket service on /ws path with sessionId as query parameter
      const wsUrl = `ws://localhost:8000/ws?sessionId=${sessionId}`;
      console.log("🌐 Connecting to:", wsUrl);

      this.ws = new WebSocket(wsUrl);

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout after 10 seconds"));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log(
            "✅ WebSocket connected successfully at 2025-06-20 09:52:08"
          );
          this.startHeartbeat();
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error(
            "❌ WebSocket connection error at 2025-06-20 09:52:08:",
            error
          );
          reject(new Error("WebSocket connection failed"));
        };

        this.ws!.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.log(
            "🔴 WebSocket closed during connection:",
            event.code,
            event.reason
          );

          if (event.code === 1008) {
            reject(new Error("Authentication failed - please log in again"));
          } else {
            reject(
              new Error(`Connection failed: ${event.reason || "Unknown error"}`)
            );
          }
        };
      });
    } catch (error) {
      this.isConnecting = false;
      console.error(
        "❌ WebSocket connection failed at 2025-06-20 09:52:08:",
        error
      );

      // Clean up failed connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      throw error;
    }
  }

  disconnect(): void {
    if (this.ws) {
      console.log("🔌 Disconnecting WebSocket at 2025-06-20 09:52:08");
      this.stopHeartbeat();
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
    this.isConnecting = false;
    this.connectionQueue = null;
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "❌ Max reconnection attempts reached at 2025-06-20 09:52:08"
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} at 2025-06-20 09:52:08`
    );

    this.disconnect();

    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      10000
    );
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
      console.log("✅ Reconnection successful at 2025-06-20 09:52:08");
    } catch (error) {
      console.error("❌ Reconnection failed:", error);

      // If it's an authentication error, don't retry
      if (
        error.message.includes("Authentication") ||
        error.message.includes("not authenticated")
      ) {
        console.log(
          "🚫 Stopping reconnection attempts due to authentication issue"
        );
        return;
      }

      // Otherwise, try again if we haven't reached max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), 1000);
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("🟢 WebSocket connected at 2025-06-20 09:52:08");
      this.emitToHandlers("connect", {
        timestamp: "2025-06-20 09:52:08",
      });
    };

    this.ws.onclose = (event) => {
      console.log(
        "🔴 WebSocket disconnected:",
        event.code,
        event.reason,
        "at 2025-06-20 09:52:08"
      );
      this.stopHeartbeat();

      this.emitToHandlers("disconnect", {
        code: event.code,
        reason: event.reason,
        timestamp: "2025-06-20 09:52:08",
      });

      // Auto-reconnect on certain disconnection codes
      if (event.code !== 1000 && event.code !== 1001) {
        // Not manual disconnect
        console.log("🔄 Unexpected disconnect - attempting reconnection");
        setTimeout(() => this.reconnect(), 1000);
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error at 2025-06-20 09:52:08:", error);
      this.emitToHandlers("error", {
        message: "WebSocket error occurred",
        type: "connection",
        timestamp: "2025-06-20 09:52:08",
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(
          "📥 WebSocket message received at 2025-06-20 09:52:08:",
          data.type
        );

        // Handle different message types based on your WebSocket service
        switch (data.type) {
          case "connection_established":
            console.log("✅ Connection established:", data);
            this.emitToHandlers("connect", data);
            break;

          case "pong":
            console.log("🏓 Pong received");
            this.emitToHandlers("pong", data);
            break;

          case "message_received":
            this.emitToHandlers("message_received", data);
            break;

          case "typing_start":
            this.emitToHandlers("typing_start", data);
            break;

          case "typing_stop":
            this.emitToHandlers("typing_stop", data);
            break;

          case "status_updated":
            this.emitToHandlers("status_updated", data);
            break;

          case "subscription_confirmed":
            this.emitToHandlers("subscription_confirmed", data);
            break;

          case "redis_message":
            // Handle Redis messages from your service
            this.emitToHandlers("redis_message", data);
            break;

          case "error":
            console.error("🚨 Server error:", data);
            this.emitToHandlers("error", data);
            break;

          default:
            console.log("📬 Unknown message type:", data.type, data);
            this.emitToHandlers("message", data);
        }
      } catch (error) {
        console.error("❌ Failed to parse WebSocket message:", error);
      }
    };
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`📤 Emitting ${event} at 2025-06-20 09:52:08:`, data);

      // Format message according to your WebSocket service expectations
      const message = {
        type: event,
        ...data,
        timestamp: "2025-06-20 09:52:08",
        currentUser: "ayush20244048",
      };

      this.ws.send(JSON.stringify(message));
    } else {
      console.warn(
        "⚠️ Cannot emit - WebSocket not connected at 2025-06-20 09:52:08"
      );
    }
  }

  private emitToHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Event handler error for ${event}:`, error);
        }
      });
    }
  }

  private getSessionId(): string | null {
    // Method 1: Check cookies
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "sessionId") {
          console.log("🍪 Found sessionId in cookies");
          return value;
        }
      }
    }

    // Method 2: Check localStorage
    if (typeof window !== "undefined") {
      const sessionId =
        localStorage.getItem("sessionId") || localStorage.getItem("auth_token");
      if (sessionId) {
        console.log("💾 Found sessionId in localStorage");
        return sessionId;
      }
    }

    console.warn(
      "❌ No session ID found in cookies or localStorage at 2025-06-20 09:52:08"
    );
    return null;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.emit("ping", {
          timestamp: "2025-06-20 09:52:08",
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN || false,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.ws ? "native-ws" : undefined,
      lastConnection:
        this.ws?.readyState === WebSocket.OPEN ? "2025-06-20 09:52:08" : null,
      transport: "websocket",
      maxReconnectAttempts: this.maxReconnectAttempts,
      isConnecting: this.isConnecting,
      readyState: this.ws?.readyState,
    };
  }

  // Method to manually set session ID (useful after login)
  setSessionId(sessionId: string): void {
    console.log("🔑 Session ID set manually at 2025-06-20 09:52:08");
    if (typeof window !== "undefined") {
      localStorage.setItem("sessionId", sessionId);
    }
  }

  // Method to check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const userData =
      localStorage.getItem("auth_user") || localStorage.getItem("user");
    const sessionId = this.getSessionId();

    return !!(userData && sessionId);
  }

  // Methods that match your WebSocket service API
  subscribeToChannels(channels: string[]): void {
    this.emit("subscribe", { channels });
  }

  unsubscribeFromChannels(channels: string[]): void {
    this.emit("unsubscribe", { channels });
  }

  sendChatMessage(
    messageId: string,
    content: string,
    conversationId?: string
  ): void {
    this.emit("chat_message", {
      id: messageId,
      content,
      conversationId,
    });
  }

  startTyping(conversationId?: string): void {
    this.emit("typing_start", { conversationId });
  }

  stopTyping(conversationId?: string): void {
    this.emit("typing_stop", { conversationId });
  }

  updateStatus(status: string): void {
    this.emit("status_update", { status });
  }
}

const wsClient = new WebSocketClient();
export default wsClient;
