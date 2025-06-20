/**
 * Admin Overview Page - Updated for Backend Integration
 * Current Time: 2025-06-20 09:16:22 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Shield,
  Crown,
  Activity,
  Server,
  MessageSquare,
  Workflow,
  TrendingUp,
  Calendar,
  Clock,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

interface AdminDashboard {
  users: {
    total: number;
    active: number;
    verified: number;
    newThisMonth: number;
  };
  sessions: {
    total: number;
    active: number;
    todaysSessions: number;
  };
  conversations: {
    total: number;
    active: number;
    totalMessages: number;
    averageLength: number;
  };
  workflows: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
  system: any;
  timestamp: string;
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      console.log(
        "📊 Fetching admin dashboard at 2025-06-20 09:16:22 by ayush20244048"
      );

      const response = await fetch(
        "http://localhost:8000/api/admin/dashboard",
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

      const data = await response.json();

      if (data.success) {
        setDashboard(data.dashboard);
        setLastRefresh(new Date().toLocaleTimeString());
        console.log("✅ Dashboard data fetched successfully");
      } else {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }
    } catch (error: any) {
      console.error(
        "❌ Error fetching dashboard at 2025-06-20 09:16:22:",
        error
      );
      // Don't show error toast for dashboard - it's not critical
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground">
            System status and administrative metrics | Session: ayush20244048 |
            2025-06-20 09:16:22
          </p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Last refreshed: {lastRefresh}
            </p>
          )}
        </div>

        <Button onClick={fetchDashboard} variant="outline" disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {/* Welcome Card for ayush20244048 */}
      <Card className="p-6 bg-gradient-to-r from-omnidimension-50 to-blue-50 border-omnidimension-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-full flex items-center justify-center">
            {user?.role === "super_admin" ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Shield className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-omnidimension-700">
              Welcome to Admin Panel, {user?.profile.firstName}! 👋
            </h2>
            <p className="text-omnidimension-600">
              You have{" "}
              {user?.role === "super_admin"
                ? "full administrative"
                : "administrative"}{" "}
              access to the OmniDimension system.
            </p>
            <p className="text-sm text-omnidimension-500 mt-1">
              Current session started at 2025-06-20 09:16:22 | Role:{" "}
              {user?.role.replace("_", " ").toUpperCase()}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Manage Users</h3>
                <p className="text-sm text-muted-foreground">
                  Promote users to admin roles
                </p>
                {dashboard && (
                  <p className="text-xs text-blue-600 mt-1">
                    {dashboard.users.total} total users
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/system">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <Server className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold">System Health</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor system performance
                </p>
                {dashboard && (
                  <p className="text-xs text-green-600 mt-1">
                    {dashboard.sessions.active} active sessions
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  View system analytics
                </p>
                {dashboard && (
                  <p className="text-xs text-purple-600 mt-1">
                    {dashboard.workflows.total} total workflows
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      {dashboard && (
        <>
          {/* User Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.users.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Users
                    </div>
                    <div className="text-xs text-green-600">
                      +{dashboard.users.newThisMonth} this month
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.users.active}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Users
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(
                        (dashboard.users.active / dashboard.users.total) *
                        100
                      ).toFixed(1)}
                      % active
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.users.verified}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Verified
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(
                        (dashboard.users.verified / dashboard.users.total) *
                        100
                      ).toFixed(1)}
                      % verified
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.sessions.todaysSessions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Today's Sessions
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dashboard.sessions.active} currently active
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Activity Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.conversations.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Conversations
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dashboard.conversations.totalMessages} total messages
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Workflow className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.workflows.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Workflows
                    </div>
                    <div className="text-xs text-green-600">
                      {dashboard.workflows.completed} completed
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Activity className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.workflows.running}
                    </div>
                    <div className="text-sm text-muted-foreground">Running</div>
                    <div className="text-xs text-red-600">
                      {dashboard.workflows.failed} failed
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboard.conversations.averageLength?.toFixed(1) || "0"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Messages
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Per conversation
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Administrative Activity
        </h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">Admin panel accessed</div>
              <div className="text-xs text-muted-foreground">
                {user?.username} opened admin panel at 2025-06-20 09:16:22
              </div>
            </div>
          </div>

          {dashboard && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Activity className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">Dashboard refreshed</div>
                <div className="text-xs text-muted-foreground">
                  Data updated at{" "}
                  {dashboard.timestamp
                    ? new Date(dashboard.timestamp).toLocaleString()
                    : "Unknown"}
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground py-4">
            Full activity logs available in the system monitoring section
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground">
        OmniDimension Admin Panel | Version 1.0.0 | Session: ayush20244048 |
        2025-06-20 09:16:22
        {dashboard && (
          <>
            <br />
            Dashboard generated at:{" "}
            {new Date(dashboard.timestamp).toLocaleString()}
          </>
        )}
      </div>
    </div>
  );
}
