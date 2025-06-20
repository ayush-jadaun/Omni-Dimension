/**
 * Application Configuration
 * Current Time: 2025-06-20 07:28:16 UTC
 * Current User: ayush20244048
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || "OmniDimension",
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  DESCRIPTION: "Intelligent Multi-Agent Automation System",
  BUILD_TIME: "2025-06-20 07:28:16",
  CURRENT_USER: "ayush20244048",

  // Feature flags
  FEATURES: {
    VOICE_CHAT: process.env.NEXT_PUBLIC_ENABLE_VOICE_CHAT === "true",
    REAL_TIME: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === "true",
    ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    ADMIN: process.env.NEXT_PUBLIC_ENABLE_ADMIN === "true",
    DEBUG: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
  },

  // UI Configuration
  UI: {
    THEME: {
      DEFAULT: "light",
      STORAGE_KEY: "omnidimension-theme",
    },
    CHAT: {
      MAX_MESSAGE_LENGTH: 4000,
      TYPING_INDICATOR_DELAY: 500,
      MESSAGE_BATCH_SIZE: 50,
      AUTO_SCROLL_THRESHOLD: 100,
    },
    NOTIFICATIONS: {
      POSITION: "top-right" as const,
      DURATION: 5000,
      MAX_NOTIFICATIONS: 5,
    },
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  CHAT: "/dashboard/chat",
  WORKFLOWS: "/dashboard/workflows",
  AGENTS: "/dashboard/agents",
  ANALYTICS: "/dashboard/analytics",
  SETTINGS: "/dashboard/settings",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_SYSTEM: "/admin/system",
  ADMIN_MONITORING: "/admin/monitoring",
} as const;

export const WS_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Authentication events
  AUTHENTICATE: "authenticate",
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",

  // Chat events
  MESSAGE_RECEIVED: "message_received",
  MESSAGE_SENT: "message_sent",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  CONVERSATION_UPDATED: "conversation_updated",

  // Workflow events
  WORKFLOW_STARTED: "workflow_started",
  WORKFLOW_UPDATED: "workflow_updated",
  WORKFLOW_COMPLETED: "workflow_completed",
  WORKFLOW_FAILED: "workflow_failed",

  // Agent events
  AGENT_STATUS_UPDATED: "agent_status_updated",
  TASK_ASSIGNED: "task_assigned",
  TASK_COMPLETED: "task_completed",

  // System events
  SYSTEM_NOTIFICATION: "system_notification",
  HEALTH_UPDATE: "health_update",
} as const;
