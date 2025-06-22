/**
 * Message Bubble Component
 * Current Time: 2025-06-20 07:39:46 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  User,
  Bot,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertCircle,
  Check,
  Clock,
  Zap,
  Phone,
  Calendar,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Message } from "@/types/chat";
import { User as UserType } from "@/types/auth";
import { clsx } from "clsx";
import toast from "react-hot-toast";

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  user: UserType;
  onRetry?: () => void;
}

export function MessageBubble({
  message,
  isLast,
  user,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === "user";
  const isAgent = message.sender === "agent";
  const isSystem = message.sender === "system";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const handleFeedback = (type: "like" | "dislike") => {
    // TODO: Implement feedback API
    toast.success(`Feedback recorded: ${type === "like" ? "👍" : "👎"}`);
    console.log(
      `📝 Feedback at 2025-06-20 07:39:46 by ayush20244048: ${type} for message ${message.id}`
    );
  };

  const getAgentIcon = () => {
    const agent = message.metadata?.agent?.toLowerCase();
    switch (agent) {
      case "nlp":
        return <Zap className="w-4 h-4" />;
      case "search":
        return <Search className="w-4 h-4" />;
      case "omnidimension":
        return <Phone className="w-4 h-4" />;
      case "orchestrator":
        return <Bot className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case "sending":
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <Check className="w-3 h-3 text-omnidimension-500" />;
      case "read":
        return <Check className="w-3 h-3 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      default:
        return null;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      className={clsx(
        "flex gap-3 message-slide-in text-black" ,
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar (for non-user messages) */}
      {!isUser && (
        <div
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0",
            isSystem ? "bg-muted text-muted-foreground" : "bg-omnidimension-500"
          )}
        >
          {isSystem ? <AlertCircle className="w-4 h-4" /> : getAgentIcon()}
        </div>
      )}

      {/* Message Content */}
      <div
        className={clsx(
          "flex flex-col max-w-[80%] lg:max-w-[60%]",
          isUser && "items-end"
        )}
      >
        {/* Message Header */}
        {!isUser && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium">
              {isSystem ? "System" : message.metadata?.agent || "AI Assistant"}
            </span>

            {message.metadata?.confidence && (
              <Badge variant="secondary" size="sm">
                {Math.round(message.metadata.confidence * 100)}% confident
              </Badge>
            )}

            {message.metadata?.intent && (
              <Badge variant="outline" size="sm">
                {message.metadata.intent}
              </Badge>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={clsx(
            "relative rounded-2xl px-4 py-3 max-w-full border-black",
            isUser
              ? "bg-omnidimension-500 border-black"
              : isSystem
              ? "bg-muted text-muted-foreground border border-border"
              : "bg-card text-card-foreground border border-border shadow-sm"
          )}
        >
          {/* Message Text */}
          <div className="prose prose-sm max-w-none dark:prose-invert text-black">
            <p className="whitespace-pre-wrap break-words m-0">
              {message.content}
            </p>
          </div>

          {/* Workflow Progress (if applicable) */}
          {message.metadata?.workflow && (
            <div className="mt-3 p-3 bg-background/10 rounded-lg">
              <div className="text-sm font-medium mb-1">
                🔄 Workflow: {message.metadata.workflow.type}
              </div>
              <div className="text-xs opacity-90">
                Status: {message.metadata.workflow.status}
                {message.metadata.workflow.step && (
                  <span> • Step: {message.metadata.workflow.step}</span>
                )}
              </div>
            </div>
          )}

          {/* Processing Time */}
          {message.metadata?.processingTime && (
            <div className="mt-2 text-xs opacity-70">
              Processed in {message.metadata.processingTime}ms
            </div>
          )}
        </div>

        {/* Message Footer */}
        <div
          className={clsx(
            "flex items-center space-x-2 mt-1 text-xs text-muted-foreground",
            isUser && "justify-end"
          )}
        >
          <span>{timeAgo}</span>

          {/* Status Icon */}
          {isUser && getStatusIcon()}

          {/* Message Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>

            {/* Retry Button (for failed messages) */}
            {message.status === "failed" && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={onRetry}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}

            {/* Feedback Buttons (for agent messages) */}
            {isAgent && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => handleFeedback("like")}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => handleFeedback("dislike")}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {message.status === "failed" && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to send message</span>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="ml-auto"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 bg-omnidimension-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
          {user.profile.firstName?.[0] || user.username[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}
