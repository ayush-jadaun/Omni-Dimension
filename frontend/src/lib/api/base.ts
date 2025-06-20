/**
 * Base API Configuration and Types
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

// API Headers Helper
export function getApiHeaders(
  additionalHeaders: Record<string, string> = {}
): HeadersInit {
  const sessionId =
    typeof window !== "undefined" ? localStorage.getItem("sessionId") : null;

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Version": API_CONFIG.VERSION,
    "X-User": API_CONFIG.CURRENT_USER,
    "X-Timestamp": "2025-06-20 07:56:07",
    "X-Build": API_CONFIG.BUILD_TIME,
    ...(sessionId && { Authorization: `Bearer ${sessionId}` }),
    ...additionalHeaders,
  };
}

// Base API Class
export class BaseAPI {
  protected baseURL: string;
  protected currentUser: string;
  protected defaultHeaders: HeadersInit;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_CONFIG.BASE_URL;
    this.currentUser = API_CONFIG.CURRENT_USER;
    this.defaultHeaders = getApiHeaders();
  }

  // Generic GET request
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
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { ...this.defaultHeaders, ...headers },
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(`❌ GET ${endpoint} failed at 2025-06-20 07:56:07:`, error);
      throw this.createApiError(error);
    }
  }

  // Generic POST request
  protected async post<T>(
    endpoint: string,
    data?: any,
    headers?: HeadersInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: { ...this.defaultHeaders, ...headers },
        body: data
          ? JSON.stringify({
              ...data,
              timestamp: "2025-06-20 07:56:07",
              currentUser: this.currentUser,
            })
          : undefined,
      });

      return await this.handleResponse<T>(response);
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
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "PUT",
        headers: { ...this.defaultHeaders, ...headers },
        body: data
          ? JSON.stringify({
              ...data,
              timestamp: "2025-06-20 07:56:07",
              currentUser: this.currentUser,
            })
          : undefined,
      });

      return await this.handleResponse<T>(response);
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
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "DELETE",
        headers: { ...this.defaultHeaders, ...headers },
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(
        `❌ DELETE ${endpoint} failed at 2025-06-20 07:56:07:`,
        error
      );
      throw this.createApiError(error);
    }
  }

  // Handle API Response
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");

    let data: any;
    try {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      throw new Error("Failed to parse response data");
    }

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
      throw apiError;
    }

    // Ensure response has proper structure
    const apiResponse: ApiResponse<T> = {
      success: true,
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
    } catch (error) {
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
}

// Request/Response interceptors
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

// Default interceptors
const interceptor = APIInterceptor.getInstance();

// Add default request interceptor for authentication
interceptor.addRequestInterceptor((config: RequestInit) => {
  const sessionId =
    typeof window !== "undefined" ? localStorage.getItem("sessionId") : null;

  if (sessionId && config.headers) {
    (config.headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${sessionId}`;
  }

  return config;
});

// Add default response interceptor for logging
interceptor.addResponseInterceptor((response: Response) => {
  if (!response.ok) {
    console.error(
      `❌ API Error ${response.status} at 2025-06-20 07:56:07:`,
      response.statusText
    );
  }
  return response;
});

export { interceptor as apiInterceptor };
