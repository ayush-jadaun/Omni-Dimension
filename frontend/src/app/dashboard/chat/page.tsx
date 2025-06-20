/**
 * Chat Interface Page - Fixed All Type Errors
 * Current Time: 2025-06-20 07:51:54 UTC
 * Current User: ayush20244048
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatMessages,
  useTypingIndicator,
  useWebSocket,
} from "@/hooks/useWebSocket";
import { chatAPI } from "@/lib/api/chat";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  MessageSquare,
  Bot,
  Zap,
  Phone,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Message, Conversation, ChatResponse } from "@/types/chat";
import { User } from "@/types/auth";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // WebSocket message handling
  const wsMessages = useChatMessages();
  const typingStatus = useTypingIndicator();

  // Check if user is available - if not, show loading
  if (!user) {
    return (
      <LoadingScreen
        message="Authenticating user..."
        submessage={`Verifying session for ayush20244048 | 2025-06-20 07:51:54`}
      />
    );
  }

  // Load initial data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);

        // Load conversations
        const conversationsResponse = await chatAPI.getConversations({
          page: 1,
          limit: 50,
        });

        if (conversationsResponse.success) {
          setConversations(conversationsResponse.conversations);
          console.log(
            `✅ Loaded ${conversationsResponse.conversations.length} conversations for ayush20244048 at 2025-06-20 07:51:54`
          );
        }

        // Load active conversation
        const activeResponse = await chatAPI.getActiveConversation();
        if (activeResponse.success && activeResponse.conversation) {
          setCurrentConversation(activeResponse.conversation);
          setMessages(activeResponse.messages || []);
          console.log(
            `✅ Loaded active conversation: ${activeResponse.conversation.conversationId} at 2025-06-20 07:51:54`
          );
        }
      } catch (error) {
        console.error(
          "❌ Error initializing chat at 2025-06-20 07:51:54:",
          error
        );
        toast.error("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1];
      console.log(
        "📨 Received WebSocket message at 2025-06-20 07:51:54:",
        latestMessage
      );

      // Add message to current conversation
      if (
        latestMessage.conversationId === currentConversation?.conversationId
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: latestMessage.messageId || `ws-${Date.now()}`,
            conversationId: latestMessage.conversationId,
            sender: "agent",
            content: latestMessage.content,
            timestamp: latestMessage.timestamp || "2025-06-20 07:51:54",
            status: "delivered",
            metadata: {
              agent: latestMessage.agent,
              confidence: latestMessage.confidence,
              currentUser: "ayush20244048",
            },
          },
        ]);
      }
    }
  }, [wsMessages, currentConversation]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
      setSending(true);

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversation?.conversationId || "",
        sender: "user",
        content: content.trim(),
        timestamp: "2025-06-20 07:51:54",
        status: "sending",
        metadata: {
          currentUser: "ayush20244048",
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      let response: ChatResponse;

      if (currentConversation) {
        // Send to existing conversation
        response = await chatAPI.sendMessage({
          message: content.trim(),
          conversationId: currentConversation.conversationId,
          timestamp: "2025-06-20 07:51:54",
          context: {
            currentUser: "ayush20244048",
            userAgent: navigator.userAgent,
          },
        });
      } else {
        // Start new conversation
        response = await chatAPI.startConversation(content.trim());

        if (response.success && response.conversationId) {
          // Load the new conversation
          const newConversationResponse = await chatAPI.getConversation(
            response.conversationId
          );
          if (newConversationResponse.success) {
            setCurrentConversation(newConversationResponse.conversation);
            setConversations((prev) => [
              newConversationResponse.conversation,
              ...prev,
            ]);
          }
        }
      }

      if (response.success) {
        // Update optimistic message to sent
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...msg, status: "sent" as const, id: response.messageId }
              : msg
          )
        );

        console.log(
          `✅ Message sent successfully at 2025-06-20 07:51:54 by ayush20244048`
        );

        // Agent response will come via WebSocket
      } else {
        throw new Error(response.message || "Failed to send message");
      }
    } catch (error: any) {
      console.error("❌ Error sending message at 2025-06-20 07:51:54:", error);

      // Update optimistic message to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...msg, status: "failed" as const }
            : msg
        )
      );

      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async () => {
    try {
      setCurrentConversation(null);
      setMessages([]);
      console.log(
        "🆕 Started new chat at 2025-06-20 07:51:54 for ayush20244048"
      );
    } catch (error) {
      console.error("❌ Error starting new chat:", error);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      const response = await chatAPI.getConversation(
        conversation.conversationId
      );
      if (response.success) {
        setCurrentConversation(response.conversation);
        setMessages(response.messages || []);
        console.log(
          `✅ Selected conversation: ${conversation.conversationId} at 2025-06-20 07:51:54`
        );
      }
    } catch (error) {
      console.error("❌ Error loading conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Loading OmniDimension Chat..."
        submessage={`Initializing for ayush20244048 | 2025-06-20 07:51:54`}
      />
    );
  }

  // Welcome state for new users
  const showWelcome = !currentConversation && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleStartNewChat}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        user={user} // Now guaranteed to be non-null
        connectionStatus={{
          isConnected,
          lastUpdate: "2025-06-20 07:51:54",
          currentUser: "ayush20244048",
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {showWelcome ? (
          <WelcomeScreen onStartChat={handleSendMessage} user={user} />
        ) : (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            currentConversation={currentConversation}
            typingStatus={typingStatus}
            sending={sending}
            isConnected={isConnected}
            user={user} // Now guaranteed to be non-null
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
      </div>
    </div>
  );
}

// Welcome Screen Component - Fixed User Type
function WelcomeScreen({
  onStartChat,
  user,
}: {
  onStartChat: (message: string) => void;
  user: User; // Fixed: Now properly typed as User instead of any
}) {
  const quickStartActions = [
    {
      title: "Book a Restaurant",
      description: "Find and reserve a table at your favorite restaurant",
      icon: "🍽️",
      prompt: "Book me a table for 2 at an Italian restaurant tonight at 7 PM",
      color: "from-red-500 to-pink-500",
    },
    {
      title: "Schedule Appointment",
      description: "Book medical, dental, or beauty appointments",
      icon: "📅",
      prompt: "Schedule a dental cleaning appointment for next week",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Plan Travel",
      description: "Get help with flights, hotels, and itineraries",
      icon: "✈️",
      prompt: "Help me plan a weekend trip to San Francisco",
      color: "from-purple-500 to-indigo-500",
    },
    {
      title: "Business Services",
      description: "Find contractors, services, and professional help",
      icon: "💼",
      prompt: "Find a reliable plumber for emergency repair",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Welcome Header */}
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-omnidimension-500 to-omnidimension-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Welcome to OmniDimension Chat! 👋
            </h1>
            <p className="text-xl text-muted-foreground">
              Hello {user.profile.firstName || "there"}! I'm your intelligent AI
              assistant.
            </p>
            <p className="text-muted-foreground mt-2">
              I can help you with bookings, appointments, research, and much
              more using voice calls and automation.
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <Card className="p-6 bg-gradient-to-r from-omnidimension-50 to-omnidimension-100/50 border-omnidimension-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <Phone className="w-8 h-8 mx-auto text-omnidimension-600" />
              <div className="text-sm font-medium">Voice Calls</div>
              <div className="text-xs text-muted-foreground">
                Real phone calls to businesses
              </div>
            </div>
            <div className="space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-omnidimension-600" />
              <div className="text-sm font-medium">Smart Booking</div>
              <div className="text-xs text-muted-foreground">
                Automated appointments
              </div>
            </div>
            <div className="space-y-2">
              <Zap className="w-8 h-8 mx-auto text-omnidimension-600" />
              <div className="text-sm font-medium">AI Agents</div>
              <div className="text-xs text-muted-foreground">
                Multiple specialized bots
              </div>
            </div>
            <div className="space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-omnidimension-600" />
              <div className="text-sm font-medium">Workflows</div>
              <div className="text-xs text-muted-foreground">
                End-to-end automation
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Start Actions */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">
            What can I help you with today?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickStartActions.map((action, index) => (
              <Card
                key={index}
                hoverable
                className="p-6 cursor-pointer transition-all duration-200 hover:scale-105"
                onClick={() => onStartChat(action.prompt)}
              >
                <div className="space-y-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl shadow-lg`}
                  >
                    {action.icon}
                  </div>

                  <div className="text-left">
                    <h3 className="font-semibold text-lg mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {action.description}
                    </p>

                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground italic">
                      "{action.prompt}"
                    </div>
                  </div>

                  <div className="flex items-center text-primary">
                    <span className="text-sm font-medium">
                      Try this example
                    </span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Status Info */}
        <div className="pt-8 border-t border-border">
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All Agents Online</span>
            </div>
            <span>•</span>
            <span>Session: ayush20244048</span>
            <span>•</span>
            <span>Time: 2025-06-20 07:51:54 UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
