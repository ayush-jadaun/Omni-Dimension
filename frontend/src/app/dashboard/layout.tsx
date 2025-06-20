/**
 * Dashboard Layout - Updated for Fixed Auth Context
 * Current Time: 2025-06-20 08:58:11 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext"; // Updated import path
import { useWebSocket } from "@/hooks/useWebSocket";
import { ROUTES } from "@/lib/config";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Wifi, WifiOff, Shield, User } from "lucide-react";

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
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced authentication check
  useEffect(() => {
    if (!isLoading && mounted) {
      console.log("🔍 Dashboard auth check at 2025-06-20 08:58:11:", {
        isAuthenticated,
        hasUser: !!user,
        username: user?.username,
        email: user?.email,
        currentUser: "ayush20244048",
        timestamp: "2025-06-20 08:58:11",
      });

      if (!isAuthenticated || !user) {
        console.log(
          "❌ Unauthorized access to dashboard, redirecting to login at 2025-06-20 08:58:11"
        );
        const currentPath = window.location.pathname;
        router.push(
          `${ROUTES.LOGIN}?redirect=${encodeURIComponent(currentPath)}`
        );
      } else {
        console.log(
          "✅ Dashboard access authorized for:",
          user.username,
          "at 2025-06-20 08:58:11"
        );
        setIsAuthChecking(false);
      }
    }
  }, [isAuthenticated, isLoading, user, router, mounted]);

  // Show loading while checking auth, during hydration, or while auth context is loading
  if (!mounted || isLoading || isAuthChecking || !isAuthenticated || !user) {
    const loadingMessage = !mounted
      ? "Initializing application..."
      : isLoading
      ? "Verifying authentication..."
      : isAuthChecking
      ? "Checking dashboard access..."
      : "Redirecting to login...";

    return (
      <LoadingScreen
        message={loadingMessage}
        submessage={`Session: ayush20244048 | Time: 2025-06-20 08:58:11 | Auth: ${
          isAuthenticated ? "✅" : "❌"
        }`}
      />
    );
  }

  // At this point, user is guaranteed to be authenticated and non-null
  return (
    <div className="min-h-screen bg-background">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>
              WebSocket connection lost - Real-time features may be unavailable
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={reconnect}
            className="text-xs hover:bg-white/20"
          >
            Reconnect
          </Button>
        </div>
      )}

      {/* Auth Success Banner for ayush20244048 */}
      {user.username === "ayush20244048" &&
        process.env.NODE_ENV === "development" && (
          <div className="bg-green-500 text-white px-4 py-1 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3" />
              <span>
                Auth Context Fixed: Session persistent across refreshes
              </span>
            </div>
            <span>Build: 2025-06-20 08:58:11</span>
          </div>
        )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          user={user}
          connectionStatus={{
            isConnected,
            lastUpdate: "2025-06-20 08:58:11",
            currentUser: "ayush20244048",
            status: isConnected ? "online" : "offline",
            wsConnected: isConnected,
          }}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header
            user={user}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            connectionStatus={{
              isConnected,
              indicator: isConnected ? "online" : "offline",
              lastSync: "2025-06-20 08:58:11",
              wsStatus: isConnected ? "connected" : "disconnected",
            }}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
            <div className="container mx-auto px-6 py-8">
              {/* Enhanced Welcome Message for ayush20244048 */}
              {user.username === "ayush20244048" && (
                <div className="mb-6 p-4 bg-gradient-to-r from-omnidimension-50 to-blue-50 border border-omnidimension-200 rounded-lg shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-omnidimension-700 mb-1">
                        <span className="text-lg">👋</span>
                        <span className="font-semibold">
                          Welcome back,{" "}
                          {user.profile?.firstName || user.username}!
                        </span>
                      </div>
                      <div className="text-sm text-omnidimension-600 space-y-1">
                        <div>Session started: 2025-06-20 08:58:11 UTC</div>
                        <div>
                          Role: {user.role} | Status:{" "}
                          {user.isActive ? "Active" : "Inactive"}
                        </div>
                        <div>
                          WebSocket:{" "}
                          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-omnidimension-500">
                      <div>User ID: {user._id}</div>
                      <div>
                        Last Login:{" "}
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Authentication Debug Panel (Development Only) */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-6 p-4 bg-muted/50 border border-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">
                    🔧 Auth Debug Info (Dev Only)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div>
                      <strong>Authentication:</strong>
                      <br />
                      Status:{" "}
                      {isAuthenticated
                        ? "✅ Authenticated"
                        : "❌ Not Authenticated"}
                      <br />
                      Loading: {isLoading ? "⏳ Loading" : "✅ Ready"}
                      <br />
                      Checking: {isAuthChecking ? "🔍 Checking" : "✅ Complete"}
                    </div>
                    <div>
                      <strong>User Data:</strong>
                      <br />
                      Username: {user.username}
                      <br />
                      Email: {user.email}
                      <br />
                      Role: {user.role}
                    </div>
                    <div>
                      <strong>Session Info:</strong>
                      <br />
                      Current User: ayush20244048
                      <br />
                      Build Time: 2025-06-20 08:58:11
                      <br />
                      WS Status: {isConnected ? "Connected" : "Disconnected"}
                    </div>
                  </div>
                </div>
              )}

              {children}
            </div>
          </main>

          {/* Enhanced Footer */}
          <footer className="bg-card border-t border-border px-6 py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>© 2025 OmniDimension</span>
                <span>•</span>
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>Build: 2025-06-20 08:58:11</span>
                <span>•</span>
                <span>User: {user.username}</span>
              </div>

              <div className="flex items-center space-x-4">
                {/* WebSocket Status */}
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">WS Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">WS Disconnected</span>
                    </>
                  )}
                </div>

                {/* Auth Status */}
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Authenticated</span>
                </div>
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

      {/* Session Persistence Indicator (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 p-2 bg-green-500 text-white text-xs rounded shadow-lg">
          ✅ Session Persistent: {user.username}
        </div>
      )}
    </div>
  );
}
