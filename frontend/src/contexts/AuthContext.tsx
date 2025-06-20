/**
 * Authentication Context Provider - Fixed CORS Headers
 * Current Time: 2025-06-20 08:43:02 UTC
 * Current User: ayush20244048
 */

"use client";

import {
  useState,
  useEffect,
  createContext,
  ReactNode,
  useCallback,
  useContext
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

// Login request interface to match the API
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

// Register request interface
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
}

// Fixed AuthContextType interface
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (profileData: Partial<User["profile"]>) => Promise<boolean>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
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
        "🔍 Checking auth state at 2025-06-20 08:43:02 for ayush20244048"
      );

      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("auth_token");

      if (storedUser && storedToken) {
        try {
          // Validate token with backend - FIXED: No custom headers
          const response = await fetch(
            "http://localhost:8000/api/auth/validate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${storedToken}`,
              },
              body: JSON.stringify({
                token: storedToken,
                timestamp: "2025-06-20 08:43:02",
                currentUser: "ayush20244048",
              }),
            }
          );

          if (response.ok) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            console.log("✅ Session validated for user:", userData.username);
          } else {
            throw new Error("Token validation failed");
          }
        } catch (error) {
          console.warn("⚠️ Token validation failed, clearing session");
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
        }
      }
    } catch (error) {
      console.error(
        "❌ Auth state check failed at 2025-06-20 08:43:02:",
        error
      );
      // Clear invalid data
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed login function - REMOVED custom headers that cause CORS issues
  const login = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      try {
        setIsLoading(true);

        console.log("🔑 Login attempt at 2025-06-20 08:43:02:", {
          email: credentials.email,
          rememberMe: credentials.rememberMe,
          currentUser: "ayush20244048",
        });

        // Call the backend API - FIXED: Only standard headers
        const response = await fetch("http://localhost:8000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // REMOVED: 'X-User': 'ayush20244048',
            // REMOVED: 'X-Timestamp': '2025-06-20 08:43:02',
          },
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
              timestamp: "2025-06-20 08:43:02",
            },
            timestamp: "2025-06-20 08:43:02",
            currentUser: "ayush20244048",
          }),
        });

        console.log("📥 Login response status:", response.status);

        if (!response.ok) {
          let errorMessage = "Login failed";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.error("❌ Login API error response:", errorData);
          } catch (e) {
            console.error("❌ Could not parse error response");
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log("📥 Login response data:", responseData);

        // Extract user and session data
        const { user: userData, session, token, success } = responseData;

        if (!success || !userData) {
          throw new Error("Invalid response from server");
        }

        // Store auth data
        const authToken = token || session?.sessionId;
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", authToken);

        setUser(userData);

        toast.success(`Welcome back, ${userData.profile.firstName}! 👋`, {
          duration: 4000,
          icon: "🎉",
        });

        console.log("✅ Login successful at 2025-06-20 08:43:02:", {
          username: userData.username,
          email: userData.email,
          role: userData.role,
        });

        return true;
      } catch (error: any) {
        console.error("❌ Login error at 2025-06-20 08:43:02:", error);

        const message =
          error.message || "Login failed. Please check your credentials.";
        toast.error(message);

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Register function - FIXED: No custom headers
  const register = useCallback(
    async (userData: RegisterRequest): Promise<boolean> => {
      try {
        setIsLoading(true);

        console.log("📝 Registration attempt at 2025-06-20 08:43:02:", {
          username: userData.username,
          email: userData.email,
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
            body: JSON.stringify({
              ...userData,
              timestamp: "2025-06-20 08:43:02",
              currentUser: "ayush20244048",
            }),
          }
        );

        if (!response.ok) {
          let errorMessage = "Registration failed";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error("❌ Could not parse error response");
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        const { user: newUser, session, token, success } = responseData;

        if (!success || !newUser) {
          throw new Error("Invalid response from server");
        }

        // Store auth data
        const authToken = token || session?.sessionId;
        localStorage.setItem("auth_user", JSON.stringify(newUser));
        localStorage.setItem("auth_token", authToken);

        setUser(newUser);

        toast.success(
          `Welcome to OmniDimension, ${newUser.profile.firstName}! 🚀`,
          {
            duration: 5000,
            icon: "🎉",
          }
        );

        console.log("✅ Registration successful at 2025-06-20 08:43:02");

        return true;
      } catch (error: any) {
        console.error("❌ Registration error at 2025-06-20 08:43:02:", error);

        const message =
          error.message || "Registration failed. Please try again.";
        toast.error(message);

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Logout function - FIXED: No custom headers
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem("auth_token");

      if (token) {
        // Call logout API
        await fetch("http://localhost:8000/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            timestamp: "2025-06-20 08:43:02",
            currentUser: "ayush20244048",
          }),
        });
      }
    } catch (error) {
      console.error("❌ Logout API error:", error);
    } finally {
      // Clear local data regardless of API success
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      setUser(null);

      toast.success("Logged out successfully");
      console.log(
        "✅ Logout successful at 2025-06-20 08:43:02 for ayush20244048"
      );

      router.push("/login");
    }
  }, [router]);

  // Refresh user data - FIXED: No custom headers
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch("http://localhost:8000/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh user data");
      }

      const userData = await response.json();

      localStorage.setItem("auth_user", JSON.stringify(userData));
      setUser(userData);

      console.log("✅ User data refreshed at 2025-06-20 08:43:02");
    } catch (error: any) {
      console.error("❌ Refresh user error at 2025-06-20 08:43:02:", error);

      if (
        error.message.includes("401") ||
        error.message.includes("authentication")
      ) {
        // Force logout on auth errors
        await logout();
      }
    }
  }, [logout]);

  // Update profile - FIXED: No custom headers
  const updateProfile = useCallback(
    async (profileData: Partial<User["profile"]>): Promise<boolean> => {
      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("No authentication token");
        }

        const response = await fetch("http://localhost:8000/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...profileData,
            timestamp: "2025-06-20 08:43:02",
            currentUser: "ayush20244048",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update profile");
        }

        const updatedUser = await response.json();

        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        toast.success("Profile updated successfully! ✅");
        console.log(
          "✅ Profile updated at 2025-06-20 08:43:02 for ayush20244048"
        );

        return true;
      } catch (error: any) {
        console.error("❌ Update profile error at 2025-06-20 08:43:02:", error);

        const message = error.message || "Failed to update profile";
        toast.error(message);

        return false;
      }
    },
    []
  );

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

      // Admin users have all permissions
      if (user.role === "admin" || user.role === "super_admin") return true;

      return user.permissions.includes(permission);
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
    hasRole,
    hasPermission,
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
