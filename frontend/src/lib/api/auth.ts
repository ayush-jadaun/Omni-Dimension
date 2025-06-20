/**
 * Authentication API - Updated with Proper Types
 * Current Time: 2025-06-20 08:04:20 UTC
 * Current User: ayush20244048
 */

import { BaseAPI } from "./base";
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  ValidateSessionResponse,
  ProfileUpdateResponse,
  PasswordChangeResponse,
  PasswordResetResponse,
  ProfileUpdateData,
  ChangePasswordRequest,
  ResetPasswordRequest,
} from "@/types/auth";

class AuthAPI extends BaseAPI {
  constructor() {
    super();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log(
        `🔑 Attempting login at 2025-06-20 08:04:20 for user: ${credentials.email}`
      );

      const response = await this.post<LoginResponse>("/api/auth/login", {
        ...credentials,
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      });

      if (response.success && response.data) {
        // Store session data
        this.storeSession(response.data.session.sessionId, response.data.user);
        return response.data;
      }

      throw new Error(response.message || "Login failed");
    } catch (error: unknown) {
      console.error("❌ Login API error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      console.log(
        `📝 Attempting registration at 2025-06-20 08:04:20 for user: ${userData.username}`
      );

      const response = await this.post<RegisterResponse>("/api/auth/register", {
        ...userData,
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      });

      if (response.success && response.data) {
        // Store session data
        this.storeSession(response.data.session.sessionId, response.data.user);
        return response.data;
      }

      throw new Error(response.message || "Registration failed");
    } catch (error: unknown) {
      console.error("❌ Registration API error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  async logout(): Promise<LogoutResponse> {
    try {
      console.log(
        "🚪 Attempting logout at 2025-06-20 08:04:20 for ayush20244048"
      );

      const sessionId = this.getSessionId();
      const response = await this.post<LogoutResponse>("/api/auth/logout", {
        sessionId,
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      });

      if (response.success && response.data) {
        this.clearSession();
        return response.data;
      }

      throw new Error(response.message || "Logout failed");
    } catch (error: unknown) {
      console.error("❌ Logout API error at 2025-06-20 08:04:20:", error);
      // Clear session even if API call fails
      this.clearSession();

      // Return a fallback response
      return {
        success: true,
        sessionCleared: true,
        message: "Logged out locally",
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      };
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const sessionId = this.getSessionId();
      if (!sessionId) return false;

      const response = await this.post<ValidateSessionResponse>(
        "/api/auth/validate",
        {
          sessionId,
          timestamp: "2025-06-20 08:04:20",
          currentUser: "ayush20244048",
        }
      );

      return response.success && response.data?.valid === true;
    } catch (error: unknown) {
      console.error(
        "❌ Session validation error at 2025-06-20 08:04:20:",
        error
      );
      return false;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.get<User>("/api/auth/me", {
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      });

      if (response.success && response.data) {
        // Update stored user data
        this.storeUser(response.data);
        return response.data;
      }

      throw new Error(response.message || "Failed to get current user");
    } catch (error: unknown) {
      console.error("❌ Get current user error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  async updateProfile(profileData: ProfileUpdateData): Promise<User> {
    try {
      console.log(
        "✏️ Updating profile at 2025-06-20 08:04:20 for ayush20244048"
      );

      const response = await this.put<ProfileUpdateResponse>(
        "/api/auth/profile",
        {
          ...profileData,
          timestamp: "2025-06-20 08:04:20",
          currentUser: "ayush20244048",
        }
      );

      if (response.success && response.data?.user) {
        // Update stored user data
        this.storeUser(response.data.user);
        return response.data.user;
      }

      throw new Error(response.message || "Failed to update profile");
    } catch (error: unknown) {
      console.error("❌ Update profile error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      console.log(
        "🔒 Changing password at 2025-06-20 08:04:20 for ayush20244048"
      );

      const request: ChangePasswordRequest = {
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
        timestamp: "2025-06-20 08:04:20",
        currentUser: "ayush20244048",
      };

      const response = await this.put<PasswordChangeResponse>(
        "/api/auth/change-password",
        request
      );

      return response.success && response.data?.passwordChanged === true;
    } catch (error: unknown) {
      console.error("❌ Change password error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      console.log(
        "🔄 Requesting password reset at 2025-06-20 08:04:20 for:",
        email
      );

      const request: ResetPasswordRequest = {
        email,
        timestamp: "2025-06-20 08:04:20",
      };

      const response = await this.post<PasswordResetResponse>(
        "/api/auth/reset-password",
        request
      );

      return response.success && response.data?.resetEmailSent === true;
    } catch (error: unknown) {
      console.error("❌ Password reset error at 2025-06-20 08:04:20:", error);
      throw error;
    }
  }

  // Session management methods
  getSessionId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sessionId");
  }

  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;

    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr) as User;
      console.log(
        "✅ Retrieved stored user at 2025-06-20 08:04:20:",
        user.username
      );
      return user;
    } catch (error) {
      console.error(
        "❌ Error parsing stored user at 2025-06-20 08:04:20:",
        error
      );
      localStorage.removeItem("user");
      return null;
    }
  }

  private storeSession(sessionId: string, user: User): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("sessionId", sessionId);
    localStorage.setItem("user", JSON.stringify(user));

    console.log("✅ Session stored at 2025-06-20 08:04:20 for:", user.username);
  }

  private storeUser(user: User): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("user", JSON.stringify(user));
    console.log(
      "✅ User data updated at 2025-06-20 08:04:20 for:",
      user.username
    );
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("sessionId");
    localStorage.removeItem("user");
    console.log("✅ Session cleared at 2025-06-20 08:04:20");
  }
}

// Create and export singleton instance
export const authAPI = new AuthAPI();
