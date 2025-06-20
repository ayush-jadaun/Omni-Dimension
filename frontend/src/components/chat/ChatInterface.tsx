/**
 * Chat Interface Component
 * Current Time: 2025-06-20 07:39:46 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicators";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Menu,
  Bot,
  Zap,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Message, Conversation, TypingStatus } from "@/types/chat";
import { User } from "@/types/auth";
import { clsx } from "clsx";
import { MessageSquare } from "lucide-react";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  currentConversation: Conversation | null;
  typingStatus: TypingStatus;
  sending: boolean;
  isConnected: boolean;
  user: User;
  onToggleSidebar: () => void;
}

export function ChatInterface({
  messages,
  onSendMessage,
  currentConversation,
  typingStatus,
  sending,
  isConnected,
  user,
  onToggleSidebar,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus.isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !sending) {
      onSendMessage(inputValue.trim());
      setInputValue("");
      console.log(
        `📤 Message sent at 2025-06-20 07:39:46 by ayush20244048: "${inputValue.trim()}"`
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleVoiceMessage = (transcript: string) => {
    if (transcript.trim()) {
      onSendMessage(transcript.trim());
      console.log(
        `🎤 Voice message sent at 2025-06-20 07:39:46 by ayush20244048: "${transcript.trim()}"`
      );
    }
  };

  const suggestions = [
    "Book a restaurant for tonight",
    "Schedule a doctor appointment",
    "Find a hotel in San Francisco",
    "Call a plumber for emergency repair",
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>

            <div>
              <h2 className="font-semibold">
                {currentConversation?.title || "New Conversation"}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Multi-Agent AI Assistant</span>
                {!isConnected && (
                  <>
                    <span>•</span>
                    <div className="flex items-center text-destructive">
                      <WifiOff className="w-3 h-3 mr-1" />
                      <span>Offline</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="success" size="sm">
            <Zap className="w-3 h-3 mr-1" />5 Agents Online
          </Badge>

          {currentConversation && (
            <Badge variant="outline" size="sm">
              {messages.length} messages
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
          <div className="flex items-center space-x-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              Connection lost. Messages may not be delivered until reconnected.
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && currentConversation && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              Start a conversation with your AI assistant
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
            user={user}
            onRetry={() => {
              if (message.status === "failed") {
                onSendMessage(message.content);
              }
            }}
          />
        ))}

        {/* Typing Indicator */}
        {typingStatus.isTyping && (
          <TypingIndicator
            agent={typingStatus.agent}
            estimatedTime={typingStatus.estimatedTime}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (when no messages) */}
      {messages.length === 0 && !typingStatus.isTyping && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue(suggestion);
                  inputRef.current?.focus();
                }}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={!isConnected}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !isConnected
                  ? "Reconnect to send messages..."
                  : "Type your message... (Press Enter to send)"
              }
              disabled={sending || !isConnected}
              className="pr-12"
              maxLength={4000}
            />

            {/* Character count */}
            {inputValue.length > 3800 && (
              <div className="absolute -top-6 right-0 text-xs text-muted-foreground">
                {inputValue.length}/4000
              </div>
            )}

            {/* Emoji Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8"
              disabled={!isConnected}
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          {/* Voice Recording */}
          <VoiceRecorder
            onTranscript={handleVoiceMessage}
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            disabled={!isConnected}
          />

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!inputValue.trim() || sending || !isConnected}
            className="shrink-0"
          >
            {sending ? (
              <div className="flex items-center space-x-2">
                <div className="spinner w-4 h-4"></div>
                <span className="hidden sm:inline">Sending...</span>
              </div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Send</span>
              </>
            )}
          </Button>
        </form>

        {/* Footer Info */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Session: ayush20244048</span>
            <span>•</span>
            <span>Time: 2025-06-20 07:39:46 UTC</span>
            {currentConversation?.conversationId && (
              <>
                <span>•</span>
                <span>ID: {currentConversation.conversationId.slice(-8)}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <div
              className={clsx(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            ></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
