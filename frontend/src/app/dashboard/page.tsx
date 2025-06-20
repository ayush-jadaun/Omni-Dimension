/**
 * Dashboard Home Page
 * Current Time: 2025-06-20 07:35:19 UTC
 * Current User: ayush20244048
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  MessageSquare,
  Workflow,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Users,
  Phone,
  Calendar,
  ArrowRight,
  Zap,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/config";

interface DashboardStats {
  totalConversations: number;
  activeWorkflows: number;
  agentsOnline: number;
  completedTasks: number;
  successRate: number;
  responseTime: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    activeWorkflows: 0,
    agentsOnline: 0,
    completedTasks: 0,
    successRate: 0,
    responseTime: 0,
  });
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setStats({
          totalConversations: 142,
          activeWorkflows: 8,
          agentsOnline: 5,
          completedTasks: 2847,
          successRate: 96.8,
          responseTime: 1.2,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: "Start Chat",
      description: "Begin a new conversation with AI agents",
      icon: MessageSquare,
      href: ROUTES.CHAT,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "View Workflows",
      description: "Monitor active automation workflows",
      icon: Workflow,
      href: ROUTES.WORKFLOWS,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Agent Status",
      description: "Check AI agent performance and health",
      icon: Bot,
      href: ROUTES.AGENTS,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Analytics",
      description: "View system metrics and insights",
      icon: BarChart3,
      href: ROUTES.ANALYTICS,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "workflow_completed",
      title: "Restaurant reservation completed",
      description: "Successfully booked table for 2 at Bella Vista Italian",
      time: "2 minutes ago",
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      id: 2,
      type: "call_made",
      title: "Appointment call in progress",
      description: "Calling Downtown Dental for appointment booking",
      time: "5 minutes ago",
      icon: Phone,
      color: "text-blue-500",
    },
    {
      id: 3,
      type: "agent_online",
      title: "NLP Agent came online",
      description: "Natural Language Processing agent is now available",
      time: "12 minutes ago",
      icon: Bot,
      color: "text-omnidimension-500",
    },
    {
      id: 4,
      type: "workflow_started",
      title: "New workflow initiated",
      description: "Travel planning workflow started for business trip",
      time: "28 minutes ago",
      icon: Workflow,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.profile.firstName || "User"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your OmniDimension system today.
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
            <span>Last login: 2025-06-20 07:35:19</span>
            <span>•</span>
            <span>User: ayush20244048</span>
            <span>•</span>
            <Badge variant={isConnected ? "success" : "destructive"} size="sm">
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        <Button asChild variant="gradient" size="lg">
          <Link href={ROUTES.CHAT}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Start New Chat
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalConversations.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workflows
            </CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.activeWorkflows}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents Online</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${stats.agentsOnline}/5`}
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${stats.successRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                hoverable
                className="transition-all duration-200 hover:scale-105"
              >
                <Link href={action.href}>
                  <CardHeader className="pb-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-primary hover:text-primary/80 transition-colors">
                      <span className="text-sm font-medium">Get started</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and completed tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`${activity.color} mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/dashboard/activity">
                  View All Activity
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              System Performance
            </CardTitle>
            <CardDescription>
              Real-time metrics and health status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Response Time */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Response Time</span>
                  <span className="text-sm text-muted-foreground">
                    {loading ? "..." : `${stats.responseTime}s`}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "85%" }}
                  ></div>
                </div>
              </div>

              {/* Success Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Success Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {loading ? "..." : `${stats.successRate}%`}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-omnidimension-500 h-2 rounded-full"
                    style={{ width: `${stats.successRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Agent Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Agent Status</span>
                  <Badge variant="success" size="sm">
                    All Online
                  </Badge>
                </div>
                <div className="space-y-2">
                  {[
                    "Orchestrator",
                    "NLP",
                    "Search",
                    "OmniDimension",
                    "Monitoring",
                  ].map((agent) => (
                    <div
                      key={agent}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {agent} Agent
                      </span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-600 text-xs">Online</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={ROUTES.AGENTS}>
                  View Detailed Metrics
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Footer */}
      <Card variant="outlined" className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>All Systems Operational</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Last updated: 2025-06-20 07:35:19
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Session: ayush20244048
              </span>
            </div>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/system-status">
                System Status
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
