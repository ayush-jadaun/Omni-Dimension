/**
 * Typing Indicator Component
 * Current Time: 2025-06-20 07:42:31 UTC
 * Current User: ayush20244048
 */

"use client";

import { Bot, Zap, Search, Phone, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface TypingIndicatorProps {
  agent?: string;
  estimatedTime?: number;
}

export function TypingIndicator({
  agent,
  estimatedTime,
}: TypingIndicatorProps) {
  const getAgentInfo = (agentName?: string) => {
    switch (agentName?.toLowerCase()) {
      case "nlp":
        return {
          name: "NLP Agent",
          icon: Zap,
          color: "text-blue-500",
          action: "analyzing your message...",
        };
      case "search":
        return {
          name: "Search Agent",
          icon: Search,
          color: "text-green-500",
          action: "finding information...",
        };
      case "omnidimension":
        return {
          name: "OmniDimension Agent",
          icon: Phone,
          color: "text-purple-500",
          action: "making phone calls...",
        };
      case "orchestrator":
        return {
          name: "Orchestrator",
          icon: Monitor,
          color: "text-orange-500",
          action: "coordinating workflow...",
        };
      default:
        return {
          name: "AI Assistant",
          icon: Bot,
          color: "text-omnidimension-500",
          action: "thinking...",
        };
    }
  };

  const agentInfo = getAgentInfo(agent);
  const Icon = agentInfo.icon;

  return (
    <div className="flex gap-3 animate-in">
      {/* Agent Avatar */}
      <div className="w-8 h-8 bg-omnidimension-500 rounded-full flex items-center justify-center text-white shrink-0">
        <Icon className="w-4 h-4" />
      </div>

      {/* Typing Content */}
      <div className="flex flex-col max-w-[80%] lg:max-w-[60%]">
        {/* Agent Header */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium">{agentInfo.name}</span>
          <Badge variant="secondary" size="sm">
            Active
          </Badge>
          {estimatedTime && (
            <Badge variant="outline" size="sm">
              ~{estimatedTime}s
            </Badge>
          )}
        </div>

        {/* Typing Bubble */}
        <div className="bg-card text-card-foreground border border-border shadow-sm rounded-2xl px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className={clsx("text-sm", agentInfo.color)}>
              {agentInfo.action}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
          <span>Active at 2025-06-20 07:42:31</span>
          <span>•</span>
          <span>Session: ayush20244048</span>
        </div>
      </div>
    </div>
  );
}
