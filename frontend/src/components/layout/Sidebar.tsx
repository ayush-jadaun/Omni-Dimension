/**
 * Sidebar Component
 * Current Time: 2025-06-20 07:38:06 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  MessageSquare,
  Workflow,
  Bot,
  BarChart3,
  Settings,
  Shield,
  Users,
  Activity,
  ChevronDown,
  ChevronRight,
  Zap,
  Phone,
  Calendar,
  Search,
  Database,
  Monitor,
  HelpCircle,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/config";
import { User } from "@/types/auth";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  connectionStatus: {
    isConnected: boolean;
    lastUpdate: string;
    currentUser: string;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
  };
  children?: NavigationItem[];
  adminOnly?: boolean;
}

export function Sidebar({
  open,
  onOpenChange,
  user,
  connectionStatus,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      name: "Dashboard",
      href: ROUTES.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      name: "Chat",
      href: ROUTES.CHAT,
      icon: MessageSquare,
      badge: { text: "3", variant: "success" },
    },
    {
      name: "Workflows",
      href: ROUTES.WORKFLOWS,
      icon: Workflow,
      badge: { text: "8", variant: "warning" },
      children: [
        {
          name: "Active Workflows",
          href: "/dashboard/workflows/active",
          icon: Zap,
        },
        {
          name: "Templates",
          href: "/dashboard/workflows/templates",
          icon: BookOpen,
        },
        {
          name: "History",
          href: "/dashboard/workflows/history",
          icon: Activity,
        },
      ],
    },
    {
      name: "Agents",
      href: ROUTES.AGENTS,
      icon: Bot,
      badge: { text: "5/5", variant: "success" },
      children: [
        {
          name: "Status Overview",
          href: "/dashboard/agents/status",
          icon: Monitor,
        },
        {
          name: "Performance",
          href: "/dashboard/agents/performance",
          icon: BarChart3,
        },
        {
          name: "Voice Calls",
          href: "/dashboard/agents/calls",
          icon: Phone,
        },
        {
          name: "Scheduling",
          href: "/dashboard/agents/scheduling",
          icon: Calendar,
        },
      ],
    },
    {
      name: "Analytics",
      href: ROUTES.ANALYTICS,
      icon: BarChart3,
      children: [
        {
          name: "Performance",
          href: "/dashboard/analytics/performance",
          icon: Activity,
        },
        {
          name: "Usage Stats",
          href: "/dashboard/analytics/usage",
          icon: BarChart3,
        },
        {
          name: "Success Rates",
          href: "/dashboard/analytics/success",
          icon: Zap,
        },
      ],
    },
    {
      name: "Settings",
      href: ROUTES.SETTINGS,
      icon: Settings,
      children: [
        {
          name: "Profile",
          href: "/dashboard/settings/profile",
          icon: Users,
        },
        {
          name: "Preferences",
          href: "/dashboard/settings/preferences",
          icon: Settings,
        },
        {
          name: "Notifications",
          href: "/dashboard/settings/notifications",
          icon: MessageSquare,
        },
      ],
    },
  ];

  // Admin navigation items
  const adminItems: NavigationItem[] = [
    {
      name: "Admin Panel",
      href: ROUTES.ADMIN,
      icon: Shield,
      adminOnly: true,
      children: [
        {
          name: "Users",
          href: ROUTES.ADMIN_USERS,
          icon: Users,
          adminOnly: true,
        },
        {
          name: "System Status",
          href: ROUTES.ADMIN_SYSTEM,
          icon: Monitor,
          adminOnly: true,
        },
        {
          name: "Monitoring",
          href: ROUTES.ADMIN_MONITORING,
          icon: Activity,
          adminOnly: true,
        },
        {
          name: "Database",
          href: "/admin/database",
          icon: Database,
          adminOnly: true,
        },
      ],
    },
  ];

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavigationItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some((child) => isActive(child.href)) || false;
  };

  const canAccessAdminFeatures =
    user.role === "admin" || user.role === "super_admin";

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    if (item.adminOnly && !canAccessAdminFeatures) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isItemActive = isActive(item.href);
    const isParentItemActive = isParentActive(item);

    return (
      <div key={item.name}>
        <div
          className={clsx(
            "flex items-center justify-between rounded-lg transition-all duration-200",
            level === 0 ? "mb-1" : "mb-0.5",
            level > 0 && "ml-4",
            isItemActive || isParentItemActive
              ? "bg-omnidimension-100 text-omnidimension-900 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Link
            href={item.href}
            className={clsx(
              "flex-1 flex items-center space-x-3 px-3 py-2 text-sm font-medium transition-colors",
              level > 0 && "text-xs"
            )}
            onClick={() => {
              if (window.innerWidth < 1024) {
                onOpenChange(false);
              }
            }}
          >
            <item.icon
              className={clsx(
                level === 0 ? "w-5 h-5" : "w-4 h-4",
                isItemActive || isParentItemActive
                  ? "text-omnidimension-600"
                  : ""
              )}
            />
            <span className={clsx(level > 0 && "text-xs")}>{item.name}</span>
            {item.badge && (
              <Badge variant={item.badge.variant} size="sm" className="ml-auto">
                {item.badge.text}
              </Badge>
            )}
          </Link>

          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 mr-1"
              onClick={() => toggleExpanded(item.name)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) =>
              renderNavigationItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">OD</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">OmniDimension</h2>
                <p className="text-xs text-muted-foreground">
                  Multi-Agent System
                </p>
              </div>
            </div>

            {/* User Context */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-omnidimension-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {user.profile.firstName?.[0] ||
                    user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.profile.firstName} {user.profile.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @
                    {user.username === "ayush20244048"
                      ? "ayush20244048"
                      : user.username}
                  </p>
                </div>
                <Badge variant="secondary" size="sm">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => renderNavigationItem(item))}

              {/* Admin Section */}
              {canAccessAdminFeatures && (
                <>
                  <div className="my-6 border-t border-border pt-4">
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Administration
                    </h3>
                  </div>
                  {adminItems.map((item) => renderNavigationItem(item))}
                </>
              )}

              {/* Help Section */}
              <div className="my-6 border-t border-border pt-4">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Support
                </h3>
              </div>

              <Link
                href="/help"
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span>Help & Support</span>
              </Link>

              <Link
                href="/docs"
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Status</span>
                <Badge
                  variant={
                    connectionStatus.isConnected ? "success" : "destructive"
                  }
                  size="sm"
                  pulse={!connectionStatus.isConnected}
                >
                  {connectionStatus.isConnected ? "Connected" : "Offline"}
                </Badge>
              </div>

              {/* System Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Build:</span>
                  <span>2025-06-20 07:38:06</span>
                </div>
                <div className="flex justify-between">
                  <span>Session:</span>
                  <span>{connectionStatus.currentUser}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
