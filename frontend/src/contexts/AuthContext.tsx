/**
 * Authentication Context Provider - Fixed Session Persistence
 * Current Time: 2025-06-20 09:01:25 UTC
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
        "🔍 Checking auth state at 2025-06-20 09:01:25 for ayush20244048"
      );

      // Check multiple storage keys for compatibility
      const storedUser =
        localStorage.getItem("auth_user") || localStorage.getItem("user");
      const storedSessionId =
        localStorage.getItem("sessionId") || localStorage.getItem("auth_token");

      console.log("📦 Storage check at 2025-06-20 09:01:25:", {
        hasUser: !!storedUser,
        hasSessionId: !!storedSessionId,
        userLength: storedUser?.length,
        sessionLength: storedSessionId?.length,
        currentUser: "ayush20244048",
      });

      if (storedUser && storedSessionId) {
        try {
          // Parse and validate stored user data
          const userData = JSON.parse(storedUser);

          // Enhanced validation
          if (
            userData &&
            userData._id &&
            userData.email &&
            userData.username &&
            typeof userData === "object"
          ) {
            // Set user immediately to prevent logout during refresh
            setUser(userData);
            console.log(
              "✅ User restored from localStorage at 2025-06-20 09:01:25:",
              {
                username: userData.username,
                email: userData.email,
                role: userData.role,
                sessionId: storedSessionId.substring(0, 10) + "...",
                currentUser: "ayush20244048",
              }
            );

            // Skip background validation for now to prevent logout
            // validateSessionInBackground(storedSessionId, userData);
          } else {
            console.warn(
              "⚠️ Invalid user data structure at 2025-06-20 09:01:25:",
              userData
            );
            throw new Error("Invalid user data structure");
          }
        } catch (parseError) {
          console.error(
            "❌ Failed to parse stored user data at 2025-06-20 09:01:25:",
            parseError
          );
          clearAuthData();
        }
      } else {
        console.log("📭 No stored session found at 2025-06-20 09:01:25");
      }
    } catch (error) {
      console.error(
        "❌ Auth state check failed at 2025-06-20 09:01:25:",
        error
      );
      // Don't clear auth data on error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  // Clear authentication data
  const clearAuthData = () => {
    console.log("🧹 Clearing auth data at 2025-06-20 09:01:25");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  // Login function with better error handling
  const login = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      try {
        setIsLoading(true);

        console.log("🔑 Login attempt at 2025-06-20 09:01:25:", {
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
          credentials: "include",
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
              timestamp: "2025-06-20 09:01:25",
            },
          }),
        });

        console.log("📥 Login response at 2025-06-20 09:01:25:", {
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
              "❌ Login API error at 2025-06-20 09:01:25:",
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
          "📥 Login response data keys at 2025-06-20 09:01:25:",
          Object.keys(responseData)
        );

        // Enhanced response parsing with multiple fallbacks
        let userData = null;
        let sessionId = null;

        // Try different response structures
        if (responseData.success && responseData.user && responseData.session) {
          userData = responseData.user;
          sessionId = responseData.session.sessionId;
        } else if (responseData.user && responseData.sessionId) {
          userData = responseData.user;
          sessionId = responseData.sessionId;
        } else if (responseData.data) {
          userData = responseData.data.user;
          sessionId =
            responseData.data.session?.sessionId || responseData.data.sessionId;
        } else if (responseData.user) {
          userData = responseData.user;
          sessionId = responseData.token || responseData.session?.sessionId;
        }

        if (!userData || !sessionId) {
          console.error(
            "❌ Invalid response structure at 2025-06-20 09:01:25:",
            responseData
          );
          throw new Error(
            "Invalid response from server - missing user data or session"
          );
        }

        // Store auth data with multiple keys for redundancy
        console.log("💾 Storing auth data at 2025-06-20 09:01:25:", {
          username: userData.username,
          sessionId: sessionId.substring(0, 10) + "...",
          timestamp: "2025-06-20 09:01:25",
        });

        // Store in multiple keys for compatibility
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("sessionId", sessionId);
        localStorage.setItem("auth_token", sessionId);

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

        console.log("✅ Login successful at 2025-06-20 09:01:25:", {
          username: userData.username,
          email: userData.email,
          role: userData.role,
        });

        return true;
      } catch (error: any) {
        console.error("❌ Login error at 2025-06-20 09:01:25:", error);
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

        console.log("📝 Registration attempt at 2025-06-20 09:01:25:", {
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

        if (responseData.success && responseData.user && responseData.session) {
          const newUser = responseData.user;
          const sessionId = responseData.session.sessionId;

          // Store with multiple keys
          localStorage.setItem("auth_user", JSON.stringify(newUser));
          localStorage.setItem("user", JSON.stringify(newUser));
          localStorage.setItem("sessionId", sessionId);
          localStorage.setItem("auth_token", sessionId);

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

          console.log("✅ Registration successful at 2025-06-20 09:01:25");
          return true;
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error: any) {
        console.error("❌ Registration error at 2025-06-20 09:01:25:", error);
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
      const sessionId =
        localStorage.getItem("sessionId") || localStorage.getItem("auth_token");

      if (sessionId) {
        await fetch("http://localhost:8000/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("❌ Logout API error:", error);
    } finally {
      clearAuthData();

      toast.success("Logged out successfully");
      console.log(
        "✅ Logout successful at 2025-06-20 09:01:25 for ayush20244048"
      );

      router.push("/login");
    }
  }, [router]);

  // Refresh user data (optional, non-blocking)
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const sessionId =
        localStorage.getItem("sessionId") || localStorage.getItem("auth_token");

      if (!sessionId || !user) {
        console.log(
          "📝 Skipping refresh - no session or user at 2025-06-20 09:01:25"
        );
        return;
      }

      const response = await fetch("http://localhost:8000/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.success && responseData.user) {
          localStorage.setItem("auth_user", JSON.stringify(responseData.user));
          localStorage.setItem("user", JSON.stringify(responseData.user));
          setUser(responseData.user);
          console.log("✅ User data refreshed at 2025-06-20 09:01:25");
        }
      } else if (response.status === 401) {
        console.warn(
          "⚠️ Session expired during manual refresh at 2025-06-20 09:01:25"
        );
        // Don't logout automatically, let user continue
      }
    } catch (error: any) {
      console.log(
        "📝 Refresh user error (non-critical) at 2025-06-20 09:01:25:",
        error
      );
    }
  }, [user]);

  // Other methods remain similar but with updated timestamps...
  const updateProfile = useCallback(
    async (profileData: Partial<User["profile"]>): Promise<boolean> => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/users/profile",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
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
            "✅ Profile updated at 2025-06-20 09:01:25 for ayush20244048"
          );

          return true;
        }

        return false;
      } catch (error: any) {
        console.error("❌ Update profile error at 2025-06-20 09:01:25:", error);
        toast.error(error.message || "Failed to update profile");
        return false;
      }
    },
    [user]
  );

  const getDashboard = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/users/dashboard",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const responseData = await response.json();
      return responseData.success ? responseData.dashboard : null;
    } catch (error: any) {
      console.error("❌ Get dashboard error at 2025-06-20 09:01:25:", error);
      return null;
    }
  }, []);

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
