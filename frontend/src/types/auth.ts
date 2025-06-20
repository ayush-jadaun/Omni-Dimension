/**
 * Authentication Types - Updated with AuthResponse
 * Current Time: 2025-06-20 08:04:20 UTC
 * Current User: ayush20244048
 */

export interface User {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  isActive: boolean;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    timezone: string;
    language: string;
    preferences: {
      theme: "light" | "dark" | "system";
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
        workflow: boolean;
      };
      privacy: {
        shareActivity: boolean;
        showOnlineStatus: boolean;
      };
    };
  };
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  promotedBy?: string;
  promotedAt?: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  user: User;
  expiresAt: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform: string;
    browser: string;
  };
  createdAt: string;
  lastActivityAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    browser: string;
    timestamp?: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    timezone: string;
  };
  termsAccepted: boolean;
  timestamp?: string;
  currentUser?: string;
}

// Base AuthResponse interface - This was missing!
export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  timestamp: string;
  currentUser?: string;
}

export interface LoginResponse extends AuthResponse {
  user: User;
  session: {
    sessionId: string;
    expiresAt: string;
  };
  permissions: string[];
}

export interface RegisterResponse extends AuthResponse {
  user: User;
  session: {
    sessionId: string;
    expiresAt: string;
  };
  permissions: string[];
}

export interface LogoutResponse extends AuthResponse {
  sessionCleared: boolean;
}

export interface ValidateSessionResponse extends AuthResponse {
  valid: boolean;
  user?: User;
  session?: {
    sessionId: string;
    expiresAt: string;
  };
}

export interface ProfileUpdateResponse extends AuthResponse {
  user: User;
  updatedFields: string[];
}

export interface PasswordChangeResponse extends AuthResponse {
  passwordChanged: boolean;
  requiresReauth: boolean;
}

export interface PasswordResetResponse extends AuthResponse {
  resetEmailSent: boolean;
  email: string;
}

export interface AuthError {
  code: string;
  message: string;
  success: boolean;
  details?: Record<string, string>;
  timestamp: string;
  currentUser?: string;
}

// Permission and Role Constants
export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export const PERMISSIONS = {
  // Chat permissions
  CHAT_READ: "chat:read",
  CHAT_WRITE: "chat:write",
  CHAT_DELETE: "chat:delete",
  CHAT_ADMIN: "chat:admin",

  // Workflow permissions
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_WRITE: "workflow:write",
  WORKFLOW_EXECUTE: "workflow:execute",
  WORKFLOW_ADMIN: "workflow:admin",

  // Agent permissions
  AGENT_VIEW: "agent:view",
  AGENT_CONTROL: "agent:control",
  AGENT_ADMIN: "agent:admin",

  // System permissions
  SYSTEM_READ: "system:read",
  SYSTEM_WRITE: "system:write",
  SYSTEM_ADMIN: "system:admin",

  // User management permissions
  USER_READ: "user:read",
  USER_WRITE: "user:write",
  USER_DELETE: "user:delete",
  USER_ADMIN: "user:admin",
} as const;

// Default permissions for each role
export const DEFAULT_PERMISSIONS = {
  [USER_ROLES.USER]: [
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.WORKFLOW_READ,
    PERMISSIONS.WORKFLOW_EXECUTE,
    PERMISSIONS.AGENT_VIEW,
  ],
  [USER_ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS).filter((p) => !p.includes("admin")),
    PERMISSIONS.CHAT_ADMIN,
    PERMISSIONS.WORKFLOW_ADMIN,
    PERMISSIONS.AGENT_ADMIN,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
  ],
  [USER_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
} as const;

// Type guards for auth responses
export function isLoginResponse(
  response: AuthResponse
): response is LoginResponse {
  return response.success && "user" in response && "session" in response;
}

export function isRegisterResponse(
  response: AuthResponse
): response is RegisterResponse {
  return response.success && "user" in response && "session" in response;
}

export function isAuthError(response: AuthResponse): response is AuthError {
  return !response.success && "code" in response;
}

// User utility types
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Profile update data type
export type ProfileUpdateData = Partial<
  Pick<
    User["profile"],
    | "firstName"
    | "lastName"
    | "phone"
    | "avatar"
    | "bio"
    | "timezone"
    | "language"
  >
> & {
  preferences?: Partial<User["profile"]["preferences"]>;
  timestamp?: string;
  currentUser?: string;
};

// Authentication context state
export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
  lastActivity: string;
}

// Device information interface
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  ip?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  timestamp: string;
}

// Session validation request
export interface ValidateSessionRequest {
  sessionId: string;
  timestamp: string;
  currentUser?: string;
}

// Password change request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  timestamp: string;
  currentUser: string;
}

// Password reset request
export interface ResetPasswordRequest {
  email: string;
  timestamp: string;
  resetToken?: string;
  newPassword?: string;
}

// Auth API configuration
export const AUTH_CONFIG = {
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  CURRENT_USER: "ayush20244048",
  BUILD_TIME: "2025-06-20 08:04:20",
} as const;
