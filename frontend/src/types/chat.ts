/**
 * Chat System Types - Updated
 * Current Time: 2025-06-20 07:47:09 UTC
 * Current User: ayush20244048
 */

export interface Message {
  id: string;
  conversationId: string;
  sender: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    messageType?: string;
    context?: Record<string, any>;
    agent?: string;
    confidence?: number;
    intent?: string;
    entities?: Record<string, any>;
    processingTime?: number;
    currentUser?: string;
    // Workflow information
    workflow?: {
      id: string;
      type: string;
      status: string;
      step?: string;
      currentStep?: number;
      totalSteps?: number;
      progress?: number;
      estimatedTime?: number;
    };
    // Call information for voice calls
    call?: {
      id: string;
      status: "initiating" | "ringing" | "connected" | "completed" | "failed";
      duration?: number;
      phoneNumber?: string;
      businessName?: string;
      purpose?: string;
    };
    // Booking information
    booking?: {
      id: string;
      type: "restaurant" | "appointment" | "hotel" | "service";
      status: "searching" | "calling" | "confirmed" | "failed";
      details?: {
        name?: string;
        date?: string;
        time?: string;
        partySize?: number;
        confirmationNumber?: string;
        address?: string;
        phone?: string;
      };
    };
    // Search results
    searchResults?: {
      query: string;
      resultCount: number;
      businesses?: Array<{
        name: string;
        rating: number;
        address: string;
        phone: string;
        distance?: string;
      }>;
    };
  };
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  reactions?: {
    userId: string;
    reaction: "like" | "dislike" | "helpful" | "not_helpful";
    timestamp: string;
  }[];
}

export interface Conversation {
  id: string;
  conversationId: string;
  userId: string;
  sessionId: string;
  title: string;
  status: "active" | "completed" | "paused" | "archived";
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    startedBy: string;
    currentUser: string;
    userAgent: string;
    platform: string;
    tags?: string[];
    priority: "low" | "normal" | "high" | "urgent";
    // Active workflows in this conversation
    activeWorkflows?: string[];
    // Completed workflows
    completedWorkflows?: Array<{
      id: string;
      type: string;
      completedAt: string;
      result: "success" | "failed" | "cancelled";
    }>;
  };
  statistics?: {
    totalMessages: number;
    averageResponseTime: number;
    userSatisfaction: number;
    workflowsCompleted: number;
  };
}

// Rest of the types remain the same...
export interface ChatMessage {
  message: string;
  conversationId?: string;
  messageType?: "user" | "system" | "multi_task";
  context?: Record<string, any>;
  parameters?: Record<string, any>;
  timestamp?: string;
}

export interface ChatResponse {
  success: boolean;
  message?:string;
  response: {
    id: string;
    content: string;
    agent: string;
    confidence: number;
    intent: string;
    suggestions?: string[];
    workflow?: {
      id: string;
      status: string;
      next_steps: string[];
    };
  };
  conversationId: string;
  messageId: string;
  suggestions: string[];
  metadata: {
    conversation: {
      id: string;
      messageCount: number;
      status: string;
    };
    user: {
      username: string;
      role: string;
    };
    timestamp: string;
    currentUser: string;
  };
}

export interface ChatErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
}
export type ChatAPIResponse = ChatResponse | ChatErrorResponse;

export interface TypingStatus {
  isTyping: boolean;
  agent?: string;
  estimatedTime?: number;
}
