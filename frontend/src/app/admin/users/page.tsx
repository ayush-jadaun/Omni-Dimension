/**
 * Admin User Management Page - Fixed Authentication
 * Current Time: 2025-06-20 09:21:52 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import {
  Users,
  Shield,
  ShieldCheck,
  Crown,
  Search,
  UserCheck,
  UserX,
  ArrowUpDown,
  Calendar,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

interface User {
  _id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  isActive: boolean;
  isEmailVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    timezone: string;
    preferences: any;
  };
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  promotedBy?: string;
  promotedAt?: string;
}

interface UserStats {
  total: number;
  active: number;
  verified: number;
  newThisMonth: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminUsersPage() {
  const { user: currentUser, hasRole, makeAuthenticatedRequest } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Check if current user has admin privileges
  if (!currentUser || (!hasRole("admin") && !hasRole("super_admin"))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to access this page.
          </p>
          <p className="text-xs text-muted-foreground">
            Current User: {currentUser?.username} | Role: {currentUser?.role} |
            Time: 2025-06-20 09:21:52
          </p>
        </Card>
      </div>
    );
  }

  // Fetch users with current filters
  useEffect(() => {
    fetchUsers();
  }, [
    pagination.page,
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  // Fetch dashboard stats
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Fetching users at 2025-06-20 09:21:52 by ayush20244048");

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        order: sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await makeAuthenticatedRequest(
        `http://localhost:8000/api/admin/users?${params}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
        setPagination(data.pagination);
        console.log("✅ Users fetched successfully:", data.users?.length || 0);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (error: any) {
      console.error("❌ Error fetching users at 2025-06-20 09:21:52:", error);
      toast.error("Failed to load users: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      console.log(
        "📊 Fetching dashboard stats at 2025-06-20 09:21:52 by ayush20244048"
      );

      const response = await makeAuthenticatedRequest(
        "http://localhost:8000/api/admin/dashboard"
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dashboard?.users) {
          setUserStats(data.dashboard.users);
          console.log("✅ Dashboard stats fetched successfully");
        }
      } else if (response.status === 401) {
        console.warn("⚠️ Unauthorized access to dashboard stats");
      }
    } catch (error) {
      console.log("📊 Dashboard stats not available:", error);
    }
  };

  const updateUserRole = async (
    userId: string,
    newRole: "user" | "admin" | "super_admin"
  ) => {
    if (!currentUser) return;

    // Only super_admin can promote to super_admin
    if (newRole === "super_admin" && !hasRole("super_admin")) {
      toast.error("Only super admins can promote users to super admin");
      return;
    }

    const user = users.find((u) => u._id === userId);
    if (!user) return;

    const action = newRole === "user" ? "demote" : "promote";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.username} (${user.email}) to ${newRole}?\n\n` +
        `This will ${
          action === "promote" ? "grant" : "remove"
        } administrative privileges.\n\n` +
        `${action === "promote" ? "Promoted" : "Demoted"} by: ${
          currentUser.username
        } at 2025-06-20 09:21:52`
    );

    if (!confirmed) return;

    try {
      setIsUpdating(userId);
      console.log(
        `👑 ${action}ing user ${user.username} to ${newRole} at 2025-06-20 09:21:52 by ayush20244048`
      );

      const response = await makeAuthenticatedRequest(
        `http://localhost:8000/api/admin/users/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            role: newRole,
            promotedBy: currentUser._id,
            promotedAt: "2025-06-20 09:21:52",
            modifiedBy: currentUser._id,
            modifiedAt: "2025-06-20 09:21:52",
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} user`);
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u._id === userId
              ? {
                  ...u,
                  role: newRole,
                  promotedBy: currentUser.username,
                  promotedAt: "2025-06-20 09:21:52",
                }
              : u
          )
        );

        const roleDisplayName =
          newRole === "super_admin"
            ? "Super Admin"
            : newRole.charAt(0).toUpperCase() + newRole.slice(1);
        toast.success(
          `${user.username} has been ${action}d to ${roleDisplayName}! ${
            action === "promote" ? "👑" : "📝"
          }`
        );
        console.log(
          `✅ User ${user.username} ${action}d successfully to ${newRole}`
        );
      } else {
        throw new Error(data.message || `${action} failed`);
      }
    } catch (error: any) {
      console.error(
        `❌ Error ${action}ing user at 2025-06-20 09:21:52:`,
        error
      );
      toast.error(`Failed to ${action} user: ` + error.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleUserStatus = async (userId: string, newStatus: boolean) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    // Prevent self-deactivation
    if (user._id === currentUser._id) {
      toast.error("You cannot deactivate yourself");
      return;
    }

    try {
      setIsUpdating(userId);
      console.log(
        `🔄 ${newStatus ? "Activating" : "Deactivating"} user ${
          user.username
        } at 2025-06-20 09:21:52 by ayush20244048`
      );

      const response = await makeAuthenticatedRequest(
        `http://localhost:8000/api/admin/users/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            isActive: newStatus,
            modifiedBy: currentUser._id,
            modifiedAt: "2025-06-20 09:21:52",
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          return;
        }
        throw new Error("Failed to update user status");
      }

      const data = await response.json();

      if (data.success) {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u._id === userId ? { ...u, isActive: newStatus } : u
          )
        );

        toast.success(
          `${user.username} has been ${newStatus ? "activated" : "deactivated"}`
        );
        console.log(
          `✅ User ${user.username} ${
            newStatus ? "activated" : "deactivated"
          } successfully`
        );
      }
    } catch (error: any) {
      console.error(
        "❌ Error updating user status at 2025-06-20 09:21:52:",
        error
      );
      toast.error("Failed to update user status: " + error.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // Rest of the component remains the same...
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (role) {
      case "super_admin":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "admin":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (isLoading && users.length === 0) {
    return (
      <LoadingScreen
        message="Loading user management..."
        submessage="Fetching user data for ayush20244048 | 2025-06-20 09:21:52"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-omnidimension-600" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users and administrative privileges | Session: ayush20244048
            | 2025-06-20 09:21:52
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={fetchUsers}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Session Status */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center space-x-2 text-green-700">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">
            ✅ Admin session active for {currentUser.username} (
            {currentUser.role}) | Using authenticated requests with credentials
          </span>
        </div>
      </Card>

      {/* Rest of the component remains the same with stats cards, filters, and table... */}
      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{userStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{userStats.active}</div>
                <div className="text-sm text-muted-foreground">
                  Active Users
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{userStats.verified}</div>
                <div className="text-sm text-muted-foreground">Verified</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {userStats.newThisMonth}
                </div>
                <div className="text-sm text-muted-foreground">
                  New This Month
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-left p-4 font-medium">Last Login</th>
                <th className="text-left p-4 font-medium">Login Count</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.profile.firstName?.charAt(0) ||
                            user.username.charAt(0).toUpperCase()}
                          {user.profile.lastName?.charAt(0) || ""}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.profile.firstName && user.profile.lastName
                            ? `${user.profile.firstName} ${user.profile.lastName}`
                            : user.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                          {user.isEmailVerified && (
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <span className={getRoleBadge(user.role)}>
                        {user.role.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          user.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          user.isActive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-sm">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-sm font-medium">
                      {user.loginCount || 0}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Promote to Admin */}
                      {user.role === "user" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserRole(user._id, "admin")}
                          disabled={isUpdating === user._id}
                          className="text-xs"
                        >
                          {isUpdating === user._id ? (
                            <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Make Admin
                            </>
                          )}
                        </Button>
                      )}

                      {/* Promote to Super Admin */}
                      {user.role === "admin" && hasRole("super_admin") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateUserRole(user._id, "super_admin")
                          }
                          disabled={isUpdating === user._id}
                          className="text-xs"
                        >
                          {isUpdating === user._id ? (
                            <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <Crown className="w-3 h-3 mr-1" />
                              Make Super Admin
                            </>
                          )}
                        </Button>
                      )}

                      {/* Demote */}
                      {(user.role === "admin" || user.role === "super_admin") &&
                        user._id !== currentUser._id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateUserRole(user._id, "user")}
                            disabled={isUpdating === user._id}
                            className="text-xs"
                          >
                            {isUpdating === user._id ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "Demote"
                            )}
                          </Button>
                        )}

                      {/* Toggle Status */}
                      {user._id !== currentUser._id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleUserStatus(user._id, !user.isActive)
                          }
                          disabled={isUpdating === user._id}
                          className="text-xs"
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="w-3 h-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No users found matching your criteria
              </p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} users
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
              >
                Previous
              </Button>

              <span className="text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Footer Info */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <div>
          Showing {users.length} of {pagination.total} users | Current User:{" "}
          {currentUser.username} ({currentUser.role}) | Time: 2025-06-20
          09:21:52
        </div>
        <div>
          ⚠️ Administrative actions are logged and audited for security purposes
        </div>
      </div>
    </div>
  );
}
