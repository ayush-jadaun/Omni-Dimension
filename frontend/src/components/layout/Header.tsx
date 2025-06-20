/**
 * Header Component
 * Current Time: 2025-06-20 07:38:06 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  Activity,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/config";
import { User as UserType } from "@/types/auth";

interface HeaderProps {
  user: UserType;
  onMenuClick: () => void;
  connectionStatus: {
    isConnected: boolean;
    indicator: "online" | "offline" | "connecting";
    lastSync: string;
  };
}

export function Header({ user, onMenuClick, connectionStatus }: HeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
      console.log(
        "✅ User logged out at 2025-06-20 07:38:06 for ayush20244048"
      );
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Mock notifications for demonstration
  const notifications = [
    {
      id: 1,
      title: "Workflow Completed",
      message: "Restaurant reservation successfully booked",
      time: "2 min ago",
      type: "success",
      unread: true,
    },
    {
      id: 2,
      title: "Agent Status Update",
      message: "NLP Agent performance improved by 15%",
      time: "15 min ago",
      type: "info",
      unread: true,
    },
    {
      id: 3,
      title: "System Maintenance",
      message: "Scheduled maintenance completed",
      time: "1 hour ago",
      type: "warning",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo & Brand */}
          <Link href={ROUTES.DASHBOARD} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">OD</span>
            </div>
            <span className="hidden sm:block text-xl font-bold gradient-text">
              OmniDimension
            </span>
          </Link>

          {/* Connection Status */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {connectionStatus.isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <Badge
                variant={
                  connectionStatus.isConnected ? "success" : "destructive"
                }
                size="sm"
              >
                {connectionStatus.indicator}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Last sync: {connectionStatus.lastSync}
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search conversations, workflows, agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Search Button (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => router.push("/dashboard/search")}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread notifications
                  </p>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                        notification.unread ? "bg-omnidimension-50/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.time}
                          </p>
                        </div>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-omnidimension-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Notifications
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon">
            <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-3"
            >
              <div className="w-8 h-8 bg-omnidimension-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.profile.firstName?.[0] || user.username[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">
                  {user.profile.firstName} {user.profile.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{user.username}
                </div>
              </div>
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-omnidimension-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.profile.firstName?.[0] ||
                        user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.profile.firstName} {user.profile.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" size="sm">
                          {user.role}
                        </Badge>
                        {user.username === "ayush20244048" && (
                          <Badge variant="agent" size="sm">
                            System Owner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href={ROUTES.SETTINGS}
                    className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/dashboard/activity"
                    className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Activity</span>
                  </Link>

                  {(user.role === "admin" || user.role === "super_admin") && (
                    <Link
                      href={ROUTES.ADMIN}
                      className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                </div>

                <div className="p-2 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="p-3 border-t border-border bg-muted/30">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Session:{" "}
                      {user.username === "ayush20244048"
                        ? "ayush20244048"
                        : user.username}
                    </div>
                    <div>Login: 2025-06-20 07:38:06 UTC</div>
                    <div>Version: 1.0.0</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden mt-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      {/* Click outside handlers */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}
