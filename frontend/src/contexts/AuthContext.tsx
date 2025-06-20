/**
 * Authentication Context Provider - Fixed Session Cookie Management
 * Current Time: 2025-06-20 09:21:52 UTC
 * Current User: ayush20244048
 */

"use client";

import {
  useState,
  useEffect,
  createContext,
  ReactNode,
  useContext,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
  firstName: string;
  lastName: string;
  termsAccepted?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (profileData: Partial<User["profile"]>) => Promise<boolean>;
  getDashboard: () => Promise<any>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  makeAuthenticatedRequest: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      console.log(
        "🔍 Checking auth state at 2025-06-20 09:21:52 for ayush20244048"
      );

      // First, try to validate session with backend
      const response = await fetch("http://localhost:8000/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies automatically
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.user) {
          const userData = responseData.user;

          // Store user data
          localStorage.setItem("auth_user", JSON.stringify(userData));
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);

          console.log("✅ Active session found at 2025-06-20 09:21:52:", {
            username: userData.username,
            email: userData.email,
            role: userData.role,
            sessionId: responseData.session?.sessionId,
            currentUser: "ayush20244048",
          });
        }
      } else if (response.status === 401) {
        console.log("📭 No active session found at 2025-06-20 09:21:52");

        // Try to restore from localStorage as fallback
        const storedUser =
          localStorage.getItem("auth_user") || localStorage.getItem("user");

        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (
              userData &&
              userData._id &&
              userData.email &&
              userData.username
            ) {
              console.log("⚠️ Using cached user data (session may be expired)");
              setUser(userData);
            }
          } catch (e) {
            clearAuthData();
          }
        }
      } else {
        console.error("❌ Auth check failed with status:", response.status);
        clearAuthData();
      }
    } catch (error) {
      console.error(
        "❌ Network error during auth check at 2025-06-20 09:21:52:",
        error
      );

      // Fallback to localStorage if network fails
      const storedUser =
        localStorage.getItem("auth_user") || localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData._id && userData.email && userData.username) {
            console.log("📦 Using cached user data due to network error");
            setUser(userData);
          }
        } catch (e) {
          clearAuthData();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Clear authentication data
  const clearAuthData = () => {
    console.log("🧹 Clearing auth data at 2025-06-20 09:21:52");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  // Make authenticated request helper
  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const config: RequestInit = {
        ...options,
        credentials: "include", // Always include cookies
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      };

      console.log(
        "🌐 Making authenticated request to:",
        url,
        "at 2025-06-20 09:21:52"
      );

      const response = await fetch(url, config);

      // If we get 401, the session might be expired
      if (response.status === 401) {
        console.warn(
          "⚠️ Received 401 for request to:",
          url,
          "at 2025-06-20 09:21:52"
        );
        // Don't auto-logout, let the component handle it
      }

      return response;
    },
    []
  );

  // Login function with better session handling
  const login = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      try {
        setIsLoading(true);

        console.log("🔑 Login attempt at 2025-06-20 09:21:52:", {
          email: credentials.email,
          rememberMe: credentials.rememberMe,
          currentUser: "ayush20244048",
        });

        const response = await fetch("http://localhost:8000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include", // Include cookies
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            rememberMe: credentials.rememberMe || false,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              browser: navigator.userAgent.includes("Chrome")
                ? "Chrome"
                : "Other",
              timestamp: "2025-06-20 09:21:52",
            },
          }),
        });

        console.log("📥 Login response at 2025-06-20 09:21:52:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          let errorMessage = "Login failed";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error(
              "❌ Login API error at 2025-06-20 09:21:52:",
              errorData
            );
          } catch (e) {
            console.error(
              "❌ Could not parse error response, status:",
              response.status
            );
            if (response.status === 400) {
              errorMessage = "Invalid email or password format";
            } else if (response.status === 401) {
              errorMessage = "Invalid credentials";
            } else if (response.status === 429) {
              errorMessage = "Too many login attempts, please try again later";
            }
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log(
          "📥 Login response data keys at 2025-06-20 09:21:52:",
          Object.keys(responseData)
        );

        // Parse response data
        let userData = null;
        let sessionData = null;

        if (responseData.success && responseData.user) {
          userData = responseData.user;
          sessionData = responseData.session;
        }

        if (!userData) {
          console.error(
            "❌ Invalid response structure at 2025-06-20 09:21:52:",
            responseData
          );
          throw new Error("Invalid response from server - missing user data");
        }

        // Store auth data
        console.log("💾 Storing auth data at 2025-06-20 09:21:52:", {
          username: userData.username,
          sessionId: sessionData?.sessionId,
          timestamp: "2025-06-20 09:21:52",
        });

        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
        if (sessionData?.sessionId) {
          localStorage.setItem("sessionId", sessionData.sessionId);
          localStorage.setItem("auth_token", sessionData.sessionId);
        }

        setUser(userData);

        toast.success(
          `Welcome back, ${
            userData.profile?.firstName || userData.username
          }! 👋`,
          {
            duration: 4000,
            icon: "🎉",
          }
        );

        console.log("✅ Login successful at 2025-06-20 09:21:52:", {
          username: userData.username,
          email: userData.email,
          role: userData.role,
        });

        return true;
      } catch (error: any) {
        console.error("❌ Login error at 2025-06-20 09:21:52:", error);
        toast.error(
          error.message || "Login failed. Please check your credentials."
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Register function
  const register = useCallback(
    async (userData: RegisterRequest): Promise<boolean> => {
      try {
        setIsLoading(true);

        console.log("📝 Registration attempt at 2025-06-20 09:21:52:", {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          currentUser: "ayush20244048",
        });

        const response = await fetch(
          "http://localhost:8000/api/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              username: userData.username,
              email: userData.email,
              password: userData.password,
              firstName: userData.firstName,
              lastName: userData.lastName,
            }),
          }
        );

        if (!response.ok) {
          let errorMessage = "Registration failed";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            console.error("❌ Could not parse registration error response");
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();

        if (responseData.success && responseData.user) {
          const newUser = responseData.user;
          const sessionData = responseData.session;

          localStorage.setItem("auth_user", JSON.stringify(newUser));
          localStorage.setItem("user", JSON.stringify(newUser));
          if (sessionData?.sessionId) {
            localStorage.setItem("sessionId", sessionData.sessionId);
            localStorage.setItem("auth_token", sessionData.sessionId);
          }

          setUser(newUser);

          toast.success(
            `Welcome to OmniDimension, ${
              newUser.profile?.firstName || newUser.username
            }! 🚀`,
            {
              duration: 5000,
              icon: "🎉",
            }
          );

          console.log("✅ Registration successful at 2025-06-20 09:21:52");
          return true;
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error: any) {
        console.error("❌ Registration error at 2025-06-20 09:21:52:", error);
        toast.error(error.message || "Registration failed. Please try again.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await makeAuthenticatedRequest("http://localhost:8000/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("❌ Logout API error:", error);
    } finally {
      clearAuthData();

      toast.success("Logged out successfully");
      console.log(
        "✅ Logout successful at 2025-06-20 09:21:52 for ayush20244048"
      );

      router.push("/login");
    }
  }, [router, makeAuthenticatedRequest]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await makeAuthenticatedRequest(
        "http://localhost:8000/api/auth/me"
      );

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.success && responseData.user) {
          localStorage.setItem("auth_user", JSON.stringify(responseData.user));
          localStorage.setItem("user", JSON.stringify(responseData.user));
          setUser(responseData.user);
          console.log("✅ User data refreshed at 2025-06-20 09:21:52");
        }
      } else if (response.status === 401) {
        console.warn(
          "⚠️ Session expired during refresh at 2025-06-20 09:21:52"
        );
        clearAuthData();
        router.push("/login");
      }
    } catch (error: any) {
      console.error("❌ Refresh user error at 2025-06-20 09:21:52:", error);
    }
  }, [router, makeAuthenticatedRequest]);

  // Update profile
  const updateProfile = useCallback(
    async (profileData: Partial<User["profile"]>): Promise<boolean> => {
      try {
        const response = await makeAuthenticatedRequest(
          "http://localhost:8000/api/users/profile",
          {
            method: "PUT",
            body: JSON.stringify(profileData),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update profile");
        }

        const responseData = await response.json();

        if (responseData.success && responseData.profile) {
          const updatedUser = { ...user, ...responseData.profile };
          localStorage.setItem("auth_user", JSON.stringify(updatedUser));
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);

          toast.success("Profile updated successfully! ✅");
          console.log(
            "✅ Profile updated at 2025-06-20 09:21:52 for ayush20244048"
          );

          return true;
        }

        return false;
      } catch (error: any) {
        console.error("❌ Update profile error at 2025-06-20 09:21:52:", error);
        toast.error(error.message || "Failed to update profile");
        return false;
      }
    },
    [user, makeAuthenticatedRequest]
  );

  // Get dashboard
  const getDashboard = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest(
        "http://localhost:8000/api/users/dashboard"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const responseData = await response.json();
      return responseData.success ? responseData.dashboard : null;
    } catch (error: any) {
      console.error("❌ Get dashboard error at 2025-06-20 09:21:52:", error);
      return null;
    }
  }, [makeAuthenticatedRequest]);

  // Role and permission helpers
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      if (user.role === "admin" || user.role === "super_admin") return true;

      return user.permissions?.includes(permission) || false;
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    getDashboard,
    hasRole,
    hasPermission,
    makeAuthenticatedRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
