export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  };
  
  export const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  };
  
  export const SESSION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    EXPIRED: 'expired'
  };
  
  export const WORKFLOW_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  };
  
  export const WORKFLOW_TYPES = {
    APPOINTMENT: 'appointment',
    RESTAURANT: 'restaurant',
    CUSTOM: 'custom',
    GENERAL_QUERY: 'general_query'
  };
  
  export const AGENT_STATUS = {
    IDLE: 'idle',
    WORKING: 'working',
    ERROR: 'error',
    OFFLINE: 'offline'
  };
  
  export const AGENT_TYPES = {
    ORCHESTRATOR: 'orchestrator',
    NLP: 'nlp',
    SEARCH: 'search',
    OMNIDIMENSION: 'omnidimension',
    MONITORING: 'monitoring'
  };
  
  export const MESSAGE_TYPES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
    AGENT: 'agent'
  };
  
  export const REDIS_CHANNELS = {
    ORCHESTRATOR: "orchestrator:main",
    TASKS: "tasks",
    TASK_RESULTS: "task_results", // This
    AGENTS: "agents:broadcast",
    WORKFLOWS: "workflows:updates",
    SESSIONS: "sessions:updates",
    WEBSOCKET: "websocket:broadcast",
    NOTIFICATIONS: "notifications",
    SYSTEM: "system",
    ORCHESTRATOR: "orchestrator",
    NLP: "agent:nlp",
    SEARCH: "agent:search",
    OMNIDIMENSION: "agent:omnidimension",
    MONITORING: "agent:monitoring",
  };
  
  export const RATE_LIMITS = {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // requests per window
    },
    CHAT: {
      windowMs: 60 * 1000, // 1 minute
      max: 10 // requests per window
    }
  };
  
  export const VALIDATION_RULES = {
    USERNAME: {
      min: 3,
      max: 30,
      pattern: /^[a-zA-Z0-9_]+$/
    },
    EMAIL: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    PASSWORD: {
      min: 8,
      max: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    }
  };
  
  export const TIMEOUTS = {
    AGENT_RESPONSE: 30000, // 30 seconds
    WORKFLOW_STEP: 60000,  // 1 minute
    EXTERNAL_API: 15000,   // 15 seconds
    SESSION_CLEANUP: 300000 // 5 minutes
  };
  
  export const MAX_LIMITS = {
    MESSAGE_LENGTH: 4000,
    WORKFLOW_STEPS: 50,
    CONCURRENT_WORKFLOWS: 5,
    CONVERSATION_HISTORY: 100
  };
  
  export const EXTERNAL_APIS = {
    GOOGLE_MAPS: {
      BASE_URL: 'https://maps.googleapis.com/maps/api',
      RATE_LIMIT: 1000, // requests per day
      TIMEOUT: 10000
    },
    OMNIDIMENSION: {
      BASE_URL: 'https://api.omnidimension.com/v1',
      RATE_LIMIT: 100, // requests per hour
      TIMEOUT: 30000
    }
  };
  
  export const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  };
  
  export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test'
  };