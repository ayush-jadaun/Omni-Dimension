/**
 * Fixed Base API Configuration and Types with Proper Session Management
 * Current Time: 2025-06-20 07:56:07 UTC
 * Current User: ayush20244048
 */

// Base API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp: string;
  metadata?: {
    currentUser: string;
    requestId: string;
    version: string;
  };
}

// API Error Interface
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

// Base API Configuration
export const API_CONFIG = {
  BASE_URL: "http://localhost:8000",
  VERSION: "v1",
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  CURRENT_USER: "ayush20244048",
  BUILD_TIME: "2025-06-20 07:56:07",
} as const;

// Session Management Helper
class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Get session token from various sources
  getSessionToken(): string | null {
    if (typeof window === "undefined") return null;

    // Try different storage keys that might contain the session
    const possibleKeys = ["sessionId", "auth_token", "token"];

    for (const key of possibleKeys) {
      const token = localStorage.getItem(key);
      if (token && token.trim()) {
        return token.trim();
      }
    }

    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const token = this.getSessionToken();
    const user =
      localStorage.getItem("auth_user") || localStorage.getItem("user");

    return !!(token && user);
  }

  // Clear all session data
  clearSession(): void {
    if (typeof window === "undefined") return;

    const keysToRemove = [
      "sessionId",
      "auth_token",
      "token",
      "auth_user",
      "user",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

// API Headers Helper with better session handling
export function getApiHeaders(
  additionalHeaders: Record<string, string> = {}
): HeadersInit {
  const sessionManager = SessionManager.getInstance();
  const sessionToken = sessionManager.getSessionToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Version": API_CONFIG.VERSION,
    "X-User": API_CONFIG.CURRENT_USER,
    "X-Timestamp": "2025-06-20 07:56:07",
    "X-Build": API_CONFIG.BUILD_TIME,
    ...additionalHeaders,
  };

  // Add authorization header if session token exists
  if (sessionToken) {
    (headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${sessionToken}`;
  }

  return headers;
}

// Enhanced Base API Class with better error handling
export class BaseAPI {
  protected baseURL: string;
  protected currentUser: string;
  protected sessionManager: SessionManager;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_CONFIG.BASE_URL;
    this.currentUser = API_CONFIG.CURRENT_USER;
    this.sessionManager = SessionManager.getInstance();
  }

  // Get default headers for each request
  private getDefaultHeaders(): HeadersInit {
    return getApiHeaders();
  }

  // Generic GET request with better session handling
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }

    try {
      const requestConfig: RequestInit = {
        method: "GET",
        headers: { ...this.getDefaultHeaders(), ...headers },
        credentials: "include", // Always include cookies
      };

      console.log(`🌐 GET ${endpoint} at 2025-06-20 07:56:07`, {
        url: url.toString(),
        hasAuth: !!this.sessionManager.getSessionToken(),
        headers: Object.keys(requestConfig.headers || {}),
      });

      const response = await fetch(url.toString(), requestConfig);
      return await this.handleResponse<T>(response, endpoint, "GET");
    } catch (error) {
      console.error(`❌ GET ${endpoint} failed at 2025-06-20 07:56:07:`, error);
      throw this.createApiError(error);
    }
  }

  // Generic POST request with better session handling
  protected async post<T>(
    endpoint: string,
    data?: any,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    try {
      const requestConfig: RequestInit = {
        method: "POST",
        headers: { ...this.getDefaultHeaders(), ...headers },
        credentials: "include", // Always include cookies
        body: data
          ? JSON.stringify({
              ...data,
              timestamp: "2025-06-20 07:56:07",
              currentUser: this.currentUser,
            })
          : undefined,
      };

      console.log(`🌐 POST ${endpoint} at 2025-06-20 07:56:07`, {
        hasAuth: !!this.sessionManager.getSessionToken(),
        hasData: !!data,
      });

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig);
      return await this.handleResponse<T>(response, endpoint, "POST");
    } catch (error) {
      console.error(
        `❌ POST ${endpoint} failed at 2025-06-20 07:56:07:`,
        error
      );
      throw this.createApiError(error);
    }
  }

  // Generic PUT request
  protected async put<T>(
    endpoint: string,
    data?: any,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    try {
      const requestConfig: RequestInit = {
        method: "PUT",
        headers: { ...this.getDefaultHeaders(), ...headers },
        credentials: "include",
        body: data
          ? JSON.stringify({
              ...data,
              timestamp: "2025-06-20 07:56:07",
              currentUser: this.currentUser,
            })
          : undefined,
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig);
      return await this.handleResponse<T>(response, endpoint, "PUT");
    } catch (error) {
      console.error(`❌ PUT ${endpoint} failed at 2025-06-20 07:56:07:`, error);
      throw this.createApiError(error);
    }
  }

  // Generic DELETE request
  protected async delete<T>(
    endpoint: string,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    try {
      const requestConfig: RequestInit = {
        method: "DELETE",
        headers: { ...this.getDefaultHeaders(), ...headers },
        credentials: "include",
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, requestConfig);
      return await this.handleResponse<T>(response, endpoint, "DELETE");
    } catch (error) {
      console.error(
        `❌ DELETE ${endpoint} failed at 2025-06-20 07:56:07:`,
        error
      );
      throw this.createApiError(error);
    }
  }

  // Enhanced response handler with better error management
  private async handleResponse<T>(
    response: Response,
    endpoint: string,
    method: string
  ): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");

    let data: any;
    try {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      console.error(
        `❌ Failed to parse response from ${method} ${endpoint}:`,
        error
      );
      throw new Error("Failed to parse response data");
    }

    // Log response details for debugging
    console.log(`📥 ${method} ${endpoint} response:`, {
      status: response.status,
      ok: response.ok,
      hasData: !!data,
      dataKeys: typeof data === "object" ? Object.keys(data) : "not-object",
    });

    if (!response.ok) {
      const apiError: ApiError = {
        message:
          data.message ||
          data.error ||
          `HTTP ${response.status}: ${response.statusText}`,
        code: data.code || response.status.toString(),
        status: response.status,
        details: data.details || data,
      };

      // Handle specific error cases
      if (response.status === 401) {
        console.warn(
          `⚠️ Unauthorized request to ${endpoint} - session may be expired`
        );
        // Don't auto-clear session here, let the auth context handle it
      }

      throw apiError;
    }

    // Ensure response has proper structure
    const apiResponse: ApiResponse<T> = {
      success: data.success !== false, // Default to true if not specified
      data: data.data || data,
      message: data.message,
      timestamp: data.timestamp || "2025-06-20 07:56:07",
      metadata: {
        currentUser: this.currentUser,
        requestId: data.requestId || `req-${Date.now()}`,
        version: API_CONFIG.VERSION,
      },
      ...data,
    };

    return apiResponse;
  }

  // Create standardized API error
  private createApiError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: "NETWORK_ERROR",
        details: { originalError: error.name },
      };
    }

    if (typeof error === "object" && error.message) {
      return error as ApiError;
    }

    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      details: { error },
    };
  }

  // Retry mechanism for failed requests
  protected async retry<T>(
    operation: () => Promise<T>,
    attempts: number = API_CONFIG.RETRY_ATTEMPTS,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Don't retry on authentication errors
      if (error.status === 401 || error.code === "NO_SESSION") {
        throw error;
      }

      if (attempts > 1) {
        console.log(
          `🔄 Retrying operation, ${
            attempts - 1
          } attempts remaining at 2025-06-20 07:56:07`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retry(operation, attempts - 1, delay * 2);
      }
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.get("/api/health");
  }

  // Session validation endpoint
  async validateSession(): Promise<
    ApiResponse<{ valid: boolean; user?: any }>
  > {
    try {
      return await this.get("/api/auth/me");
    } catch (error: any) {
      if (error.status === 401) {
        // Session is invalid
        return {
          success: false,
          data: { valid: false },
          message: "Session invalid",
          timestamp: "2025-06-20 07:56:07",
        };
      }
      throw error;
    }
  }
}

// Enhanced Request/Response interceptors
export class APIInterceptor {
  private static instance: APIInterceptor;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<
    (response: Response) => Response | Promise<Response>
  > = [];

  static getInstance(): APIInterceptor {
    if (!APIInterceptor.instance) {
      APIInterceptor.instance = new APIInterceptor();
    }
    return APIInterceptor.instance;
  }

  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ) {
    this.responseInterceptors.push(interceptor);
  }

  async processRequest(config: RequestInit): Promise<RequestInit> {
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = interceptor(processedConfig);
    }
    return processedConfig;
  }

  async processResponse(response: Response): Promise<Response> {
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    return processedResponse;
  }
}

// Initialize default interceptors
const interceptor = APIInterceptor.getInstance();
const sessionManager = SessionManager.getInstance();

// Enhanced request interceptor for authentication
interceptor.addRequestInterceptor((config: RequestInit) => {
  const sessionToken = sessionManager.getSessionToken();

  if (sessionToken && config.headers) {
    (config.headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${sessionToken}`;
  }

  // Ensure credentials are always included
  config.credentials = "include";

  return config;
});

// Enhanced response interceptor for logging and error handling
interceptor.addResponseInterceptor((response: Response) => {
  if (!response.ok) {
    console.error(`❌ API Error ${response.status} at 2025-06-20 07:56:07:`, {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
    });

    // If 401, the session might be expired
    if (response.status === 401) {
      console.warn("⚠️ Received 401 - session may be expired");
      // Let the auth context handle session cleanup
    }
  }
  return response;
});

export { interceptor as apiInterceptor, SessionManager };
