/**
 * Chat Sidebar Component - Fixed Key Props and Property Access
 * Current Time: 2025-06-20 11:18:58 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Archive,
  Star,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Conversation } from "@/types/chat";
import { User as UserType } from "@/types/auth";
import { clsx } from "clsx";

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType;
  connectionStatus: {
    isConnected: boolean;
    lastUpdate: string;
    currentUser: string;
  };
}

export function ChatSidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewChat,
  open,
  onOpenChange,
  user,
  connectionStatus,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] =
    useState(conversations);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">(
    "all"
  );

  // Helper function to get conversation ID safely
  const getConversationId = (conversation: Conversation): string => {
    return (
      conversation.id ||
      conversation.conversationId ||
      `temp-${Date.now()}-${Math.random()}`
    );
  };

  // Filter conversations based on search and tab
  useEffect(() => {
    let filtered = conversations;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((conv) => {
        const convId = getConversationId(conv);
        return (
          conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          convId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Filter by tab
    switch (activeTab) {
      case "active":
        filtered = filtered.filter((conv) => conv.status === "active");
        break;
      case "completed":
        filtered = filtered.filter((conv) => conv.status === "completed");
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredConversations(filtered);
    console.log(
      `🔍 Filtered ${filtered.length} conversations at 2025-06-20 11:18:58 for ayush20244048`
    );
  }, [conversations, searchQuery, activeTab]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <MessageSquare className="w-3 h-3 text-green-500" />;
      case "completed":
        return <CheckCircle className="w-3 h-3 text-blue-500" />;
      case "paused":
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case "archived":
        return <Archive className="w-3 h-3 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="default"
            size="sm"
            className="bg-green-100 text-green-800"
          >
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" size="sm">
            Done
          </Badge>
        );
      case "paused":
        return (
          <Badge
            variant="outline"
            size="sm"
            className="border-yellow-300 text-yellow-700"
          >
            Paused
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" size="sm">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="sm">
            Unknown
          </Badge>
        );
    }
  };

  const tabCounts = {
    all: conversations.length,
    active: conversations.filter((c) => c.status === "active").length,
    completed: conversations.filter((c) => c.status === "completed").length,
  };

  // Helper function to get current conversation ID for comparison
  const getCurrentConversationId = (): string | null => {
    if (!currentConversation) return null;
    return getConversationId(currentConversation);
  };

  return (
    <div
      className={clsx(
        "bg-card border-r border-border flex flex-col transition-all duration-300",
        open ? "w-80" : "w-0 overflow-hidden lg:w-80"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewChat}
              className="shrink-0"
              title="Start new conversation"
            >
              <Plus className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="lg:hidden"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "completed", label: "Done" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={clsx(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className="ml-1 text-xs">
                ({tabCounts[tab.key as keyof typeof tabCounts]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {user.profile?.firstName?.[0] ||
              user.username?.[0]?.toUpperCase() ||
              "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {user.profile?.firstName && user.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.username || "Unknown User"}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              Session: ayush20244048
            </div>
          </div>
          <Badge
            variant={connectionStatus.isConnected ? "default" : "destructive"}
            size="sm"
            className={
              connectionStatus.isConnected ? "bg-green-100 text-green-800" : ""
            }
          >
            {connectionStatus.isConnected ? "Online" : "Offline"}
          </Badge>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Last update: 2025-06-20 11:18:58 UTC
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery ? (
              <div className="space-y-2">
                <Search className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No conversations found
                </p>
                <p className="text-xs text-muted-foreground">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start your first conversation with the AI assistant
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNewChat}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation, index) => {
              const conversationId = getConversationId(conversation);
              const currentConversationId = getCurrentConversationId();

              return (
                <ConversationItem
                  key={conversationId} // FIXED: Use safe ID getter
                  conversation={conversation}
                  isActive={currentConversationId === conversationId}
                  onClick={() => onSelectConversation(conversation)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  conversationId={conversationId} // Pass the safe ID
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Total:</span>
            <span>{conversations.length} conversations</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span>{tabCounts.active} running</span>
          </div>
          <div className="flex justify-between">
            <span>Session:</span>
            <span>ayush20244048</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>2025-06-20 11:18:58</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual Conversation Item Component
function ConversationItem({
  conversation,
  isActive,
  onClick,
  getStatusIcon,
  getStatusBadge,
  conversationId, // Accept the safe ID as prop
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  conversationId: string; // Add this prop
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Safe date handling
  const getTimeAgo = () => {
    try {
      const date =
        conversation.updatedAt ||
        conversation.createdAt ||
        new Date().toISOString();
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      console.warn("⚠️ Invalid date format in conversation:", error);
      return "Unknown time";
    }
  };

  const timeAgo = getTimeAgo();

  const handleMenuAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    switch (action) {
      case "archive":
        console.log(
          `📁 Archiving conversation ${conversationId} at 2025-06-20 11:18:58`
        );
        break;
      case "delete":
        console.log(
          `🗑️ Deleting conversation ${conversationId} at 2025-06-20 11:18:58`
        );
        break;
      case "star":
        console.log(
          `⭐ Starring conversation ${conversationId} at 2025-06-20 11:18:58`
        );
        break;
    }
  };

  // Safe property access
  const messageCount =
    conversation.metadata?.messageCount || conversation.messages?.length || 0;
  const status = conversation.status || "active";
  const title = conversation.title || "Untitled Conversation";

  return (
    <div
      className={clsx(
        "relative p-3 rounded-lg cursor-pointer transition-colors group",
        isActive
          ? "bg-blue-100 text-blue-900 border border-blue-200"
          : "hover:bg-muted"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            <h3 className="font-medium text-sm truncate">{title}</h3>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="truncate">{messageCount} messages</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            {getStatusBadge(status)}

            <div className="text-xs text-muted-foreground">
              ID: {conversationId.slice(-6)}
            </div>
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-md shadow-lg z-50">
              <div className="p-1">
                <button
                  className="w-full flex items-center space-x-2 px-2 py-1 text-sm hover:bg-muted rounded-sm transition-colors"
                  onClick={(e) => handleMenuAction("star", e)}
                >
                  <Star className="w-3 h-3" />
                  <span>Star</span>
                </button>
                <button
                  className="w-full flex items-center space-x-2 px-2 py-1 text-sm hover:bg-muted rounded-sm transition-colors"
                  onClick={(e) => handleMenuAction("archive", e)}
                >
                  <Archive className="w-3 h-3" />
                  <span>Archive</span>
                </button>
                <button
                  className="w-full flex items-center space-x-2 px-2 py-1 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
                  onClick={(e) => handleMenuAction("delete", e)}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
