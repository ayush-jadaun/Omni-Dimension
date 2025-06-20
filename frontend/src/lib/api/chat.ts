/**
 * Chat API - Updated with Base API
 * Current Time: 2025-06-20 07:56:07 UTC
 * Current User: ayush20244048
 */

import { BaseAPI, ApiResponse } from "./base";
import {
  Message,
  Conversation,
  ChatMessage,
  ChatResponse,
  ChatErrorResponse,
  ChatAPIResponse,
} from "@/types/chat";

// Type guard for successful chat response
function isSuccessfulChatResponse(
  response: ChatAPIResponse
): response is ChatResponse {
  return (
    response.success === true &&
    "conversationId" in response &&
    "messageId" in response
  );
}

// Type guard for error chat response
function isChatErrorResponse(
  response: ChatAPIResponse
): response is ChatErrorResponse {
  return response.success === false && "message" in response;
}

// Chat-specific API responses
interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

interface ConversationResponse {
  conversation: Conversation;
  messages: Message[];
}

interface ActiveConversationResponse {
  conversation?: Conversation;
  messages?: Message[];
}

class ChatAPI extends BaseAPI {
  constructor() {
    super();
  }

  async sendMessage(chatMessage: ChatMessage): Promise<ChatResponse> {
    try {
      console.log(`📤 Sending message at 2025-06-20 07:56:07 by ayush20244048`);

      const response = await this.post<ChatResponse>("/api/chat/message", {
        ...chatMessage,
        timestamp: "2025-06-20 07:56:07",
        currentUser: "ayush20244048",
        context: {
          ...chatMessage.context,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "Server",
          platform:
            typeof navigator !== "undefined" ? navigator.platform : "Server",
        },
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || "Failed to send message");
    } catch (error: any) {
      console.error("❌ Chat sendMessage Error at 2025-06-20 07:56:07:", error);
      throw new Error(error.message || "Failed to send message");
    }
  }

  async startConversation(message: string): Promise<ChatResponse> {
    try {
      console.log(
        `🆕 Starting conversation at 2025-06-20 07:56:07 by ayush20244048`
      );

      const response = await this.post<ChatResponse>("/api/chat/start", {
        message,
        timestamp: "2025-06-20 07:56:07",
        currentUser: "ayush20244048",
        context: {
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "Server",
          platform:
            typeof navigator !== "undefined" ? navigator.platform : "Server",
          sessionStart: "2025-06-20 07:56:07",
        },
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || "Failed to start conversation");
    } catch (error: any) {
      console.error(
        "❌ Chat startConversation Error at 2025-06-20 07:56:07:",
        error
      );
      throw new Error(error.message || "Failed to start conversation");
    }
  }

  async getConversations(params: { page: number; limit: number }): Promise<{
    success: boolean;
    conversations: Conversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      console.log(
        `📋 Fetching conversations at 2025-06-20 07:56:07 for ayush20244048`
      );

      const response = await this.get<ConversationsResponse>(
        "/api/chat/conversations",
        {
          page: params.page,
          limit: params.limit,
          user: "ayush20244048",
          timestamp: "2025-06-20 07:56:07",
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          ...response.data,
        };
      }

      throw new Error(response.message || "Failed to fetch conversations");
    } catch (error: any) {
      console.error(
        "❌ Chat getConversations Error at 2025-06-20 07:56:07:",
        error
      );
      return {
        success: false,
        conversations: [],
        total: 0,
        page: params.page,
        limit: params.limit,
      };
    }
  }

  async getConversation(conversationId: string): Promise<{
    success: boolean;
    conversation: Conversation;
    messages: Message[];
  }> {
    try {
      console.log(
        `📖 Fetching conversation ${conversationId} at 2025-06-20 07:56:07`
      );

      const response = await this.get<ConversationResponse>(
        `/api/chat/conversations/${conversationId}`,
        {
          user: "ayush20244048",
          timestamp: "2025-06-20 07:56:07",
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          ...response.data,
        };
      }

      throw new Error(response.message || "Failed to fetch conversation");
    } catch (error: any) {
      console.error(
        "❌ Chat getConversation Error at 2025-06-20 07:56:07:",
        error
      );
      throw new Error(error.message || "Failed to fetch conversation");
    }
  }

  async getActiveConversation(): Promise<{
    success: boolean;
    conversation?: Conversation;
    messages?: Message[];
  }> {
    try {
      console.log(
        `🔍 Fetching active conversation at 2025-06-20 07:56:07 for ayush20244048`
      );

      const response = await this.get<ActiveConversationResponse>(
        "/api/chat/active",
        {
          user: "ayush20244048",
          timestamp: "2025-06-20 07:56:07",
        }
      );

      if (response.success) {
        return {
          success: true,
          ...(response.data || {}),
        };
      }

      // Active conversation not found is not an error
      return { success: true };
    } catch (error: any) {
      console.error(
        "❌ Chat getActiveConversation Error at 2025-06-20 07:56:07:",
        error
      );

      // If 404, it means no active conversation exists
      if (error.status === 404) {
        return { success: true };
      }

      throw new Error(error.message || "Failed to fetch active conversation");
    }
  }

  // Additional chat methods
  async deleteConversation(
    conversationId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(
        `🗑️ Deleting conversation ${conversationId} at 2025-06-20 07:56:07`
      );

      const response = await this.delete(
        `/api/chat/conversations/${conversationId}`
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error(
        "❌ Chat deleteConversation Error at 2025-06-20 07:56:07:",
        error
      );
      return {
        success: false,
        message: error.message || "Failed to delete conversation",
      };
    }
  }

  async archiveConversation(
    conversationId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(
        `📁 Archiving conversation ${conversationId} at 2025-06-20 07:56:07`
      );

      const response = await this.put(
        `/api/chat/conversations/${conversationId}/archive`,
        {
          action: "archive",
          timestamp: "2025-06-20 07:56:07",
        }
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error(
        "❌ Chat archiveConversation Error at 2025-06-20 07:56:07:",
        error
      );
      return {
        success: false,
        message: error.message || "Failed to archive conversation",
      };
    }
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(
        `✏️ Updating conversation ${conversationId} title at 2025-06-20 07:56:07`
      );

      const response = await this.put(
        `/api/chat/conversations/${conversationId}`,
        {
          title,
          timestamp: "2025-06-20 07:56:07",
        }
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error(
        "❌ Chat updateConversationTitle Error at 2025-06-20 07:56:07:",
        error
      );
      return {
        success: false,
        message: error.message || "Failed to update conversation title",
      };
    }
  }
}

// Create and export singleton instance
export const chatAPI = new ChatAPI();

// Export types for use in components
export type {
  ConversationsResponse,
  ConversationResponse,
  ActiveConversationResponse,
};
