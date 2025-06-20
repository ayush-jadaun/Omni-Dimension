/**
 * Home Page - Landing/Dashboard Redirect
 * Current Time: 2025-06-20 07:33:02 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/config";
import { LoadingScreen } from "@/components/common/LoadingScreen";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect authenticated users to dashboard
        console.log(
          "✅ Redirecting authenticated user to dashboard at 2025-06-20 07:33:02"
        );
        router.replace(ROUTES.DASHBOARD);
      } else {
        // Redirect unauthenticated users to login
        console.log(
          "❌ Redirecting unauthenticated user to login at 2025-06-20 07:33:02"
        );
        router.replace(ROUTES.LOGIN);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading screen while determining auth state
  if (isLoading) {
    return (
      <LoadingScreen
        message="Initializing OmniDimension System..."
        submessage={`Build: 2025-06-20 07:33:02 | User: ayush20244048`}
      />
    );
  }

  // This should rarely be seen due to redirects above
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <h1 className="text-4xl font-bold gradient-text">OmniDimension</h1>
          <p className="text-muted-foreground mt-2">
            Intelligent Multi-Agent Automation
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <div className="spinner w-4 h-4"></div>
          <span>Redirecting...</span>
        </div>

        <div className="text-xs text-muted-foreground/60">
          v1.0.0 | 2025-06-20 07:33:02 | ayush20244048
        </div>
      </div>
    </div>
  );
}
