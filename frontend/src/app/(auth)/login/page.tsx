/**
 * Login Page - Fixed Form Fields
 * Current Time: 2025-06-20 08:36:17 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { Eye, EyeOff, LogIn, Mail, Lock, User } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();

  // Form state - Using email instead of username
  const [formData, setFormData] = useState({
    email: "", // Changed from username to email
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);

      console.log("🔑 Login attempt at 2025-06-20 08:36:17:", {
        email: formData.email,
        rememberMe: formData.rememberMe,
        currentUser: "ayush20244048",
      });

      // Updated to send email instead of username
      const success = await login({
        email: formData.email, // Backend expects email
        password: formData.password, // Ensure password is sent correctly
        rememberMe: formData.rememberMe,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          browser: navigator.userAgent.includes("Chrome") ? "Chrome" : "Other",
          timestamp: "2025-06-20 08:36:17",
        },
      });

      if (success) {
        const redirectTo = searchParams.get("redirect") || "/dashboard";
        console.log("✅ Login successful, redirecting to:", redirectTo);
        router.push(redirectTo);
      }
    } catch (error: any) {
      console.error("❌ Login error at 2025-06-20 08:36:17:", error);
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Checking authentication..."
        submessage="Please wait while we verify your session | 2025-06-20 08:36:17"
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-2xl flex items-center justify-center shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to your OmniDimension account
          </p>
          <div className="text-xs text-muted-foreground">
            Session: ayush20244048 | 2025-06-20 08:36:17
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field - Changed from Username */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center space-x-2">
            <input
              id="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) =>
                handleInputChange("rememberMe", e.target.checked)
              }
              disabled={isSubmitting}
              className="rounded border-gray-300 text-omnidimension-600 focus:ring-omnidimension-500"
            />
            <label
              htmlFor="rememberMe"
              className="text-sm text-muted-foreground"
            >
              Keep me signed in for 30 days
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !formData.email || !formData.password}
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing In...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </div>
            )}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="space-y-4 text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-omnidimension-600 hover:text-omnidimension-700 hover:underline"
          >
            Forgot your password?
          </Link>

          <div className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-omnidimension-600 hover:text-omnidimension-700 font-medium hover:underline"
            >
              Sign up here
            </Link>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <strong>Debug Info:</strong>
            <br />
            API URL: {process.env.NEXT_PUBLIC_API_URL}
            <br />
            Current User: ayush20244048
            <br />
            Build Time: 2025-06-20 08:36:17
            <br />
            Form Data:{" "}
            {JSON.stringify({
              email: formData.email,
              hasPassword: !!formData.password,
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
