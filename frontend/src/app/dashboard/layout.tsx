/**
 * Dashboard Layout - Fixed
 * Current Time: 2025-06-20 07:50:20 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ROUTES } from "@/lib/config";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isConnected, reconnect } = useWebSocket();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(
        "❌ Unauthorized access to dashboard, redirecting to login at 2025-06-20 07:50:20"
      );
      router.push(
        `${ROUTES.LOGIN}?redirect=${encodeURIComponent(
          window.location.pathname
        )}`
      );
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth or during hydration
  if (!mounted || isLoading || !isAuthenticated || !user) {
    return (
      <LoadingScreen
        message="Connecting to OmniDimension..."
        submessage={`Authenticating user: ayush20244048 | 2025-06-20 07:50:20`}
      />
    );
  }

  // At this point, user is guaranteed to be non-null due to the check above
  return (
    <div className="min-h-screen bg-background">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>Connection lost - Some features may be unavailable</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={reconnect}
            className="text-xs"
          >
            Reconnect
          </Button>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          user={user} // Now guaranteed to be non-null
          connectionStatus={{
            isConnected,
            lastUpdate: "2025-06-20 07:50:20",
            currentUser: "ayush20244048",
          }}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header
            user={user} // Now guaranteed to be non-null
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            connectionStatus={{
              isConnected,
              indicator: isConnected ? "online" : "offline",
              lastSync: "2025-06-20 07:50:20",
            }}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
            <div className="container mx-auto px-6 py-8">
              {/* Welcome Message for ayush20244048 */}
              {user.username === "ayush20244048" && (
                <div className="mb-6 p-4 bg-omnidimension-50 border border-omnidimension-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-omnidimension-700">
                    <span className="text-lg">👋</span>
                    <span className="font-medium">
                      Welcome back, {user.profile.firstName}! Your session
                      started at 2025-06-20 07:50:20
                    </span>
                  </div>
                </div>
              )}

              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-card border-t border-border px-6 py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>© 2025 OmniDimension</span>
                <span>•</span>
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>Build: 2025-06-20 07:50:20</span>
              </div>

              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
