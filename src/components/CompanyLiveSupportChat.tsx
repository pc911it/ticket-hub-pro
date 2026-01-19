import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'company_user' | 'super_admin';
  message: string;
  created_at: string;
}

interface SupportChat {
  id: string;
  company_id: string;
  initiated_by: string;
  status: 'waiting' | 'active' | 'closed';
  assigned_admin: string | null;
  subject: string | null;
  created_at: string;
}

export function CompanyLiveSupportChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [subject, setSubject] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user's company ID
  const { data: companyId } = useQuery({
    queryKey: ['user-company-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.company_id;
    },
    enabled: !!user?.id,
  });

  // Get active chat for the company
  const { data: activeChat, refetch: refetchChat } = useQuery({
    queryKey: ['company-support-chat', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('company_support_chats')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SupportChat | null;
    },
    enabled: !!companyId,
  });

  // Get messages for active chat
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['support-chat-messages', activeChat?.id],
    queryFn: async () => {
      if (!activeChat?.id) return [];
      const { data, error } = await supabase
        .from('company_support_chat_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!activeChat?.id,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeChat?.id) return;

    const channel = supabase
      .channel(`support-chat-${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_support_chat_messages',
          filter: `chat_id=eq.${activeChat.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['support-chat-messages', activeChat.id] });
          // Play sound for super admin messages
          if ((payload.new as ChatMessage).sender_type === 'super_admin') {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_support_chats',
          filter: `id=eq.${activeChat.id}`,
        },
        () => {
          refetchChat();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat?.id, queryClient, refetchChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new chat
  const startChatMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('company_support_chats')
        .insert({
          company_id: companyId,
          initiated_by: user.id,
          subject: subject || 'Support Request',
          status: 'waiting',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchChat();
      setSubject("");
      toast.success("Connected! Waiting for a support agent...");
    },
    onError: (error) => {
      toast.error("Failed to start chat: " + error.message);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!activeChat?.id || !user?.id) throw new Error('No active chat');
      const { error } = await supabase
        .from('company_support_chat_messages')
        .insert({
          chat_id: activeChat.id,
          sender_id: user.id,
          sender_type: 'company_user',
          message,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    },
  });

  // Close chat
  const closeChatMutation = useMutation({
    mutationFn: async () => {
      if (!activeChat?.id) throw new Error('No active chat');
      const { error } = await supabase
        .from('company_support_chats')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', activeChat.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchChat();
      toast.success("Chat ended");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    startChatMutation.mutate();
  };

  if (!companyId) return null;

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-56 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        size="icon"
        title="Live Support"
      >
        <Headphones className="h-6 w-6 text-white" />
        {activeChat && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-background border rounded-lg shadow-2xl transition-all duration-200",
        isMinimized
          ? "bottom-56 right-6 w-72 h-14"
          : "bottom-56 right-6 w-96 h-[500px] max-h-[70vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          <span className="font-semibold">Live Support</span>
          {activeChat && (
            <Badge variant={activeChat.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {activeChat.status === 'waiting' ? 'Waiting...' : 'Connected'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-56px)]">
          {!activeChat ? (
            // Start chat form
            <form onSubmit={handleStartChat} className="p-4 space-y-4 flex-1 flex flex-col justify-center">
              <div className="text-center space-y-2">
                <Headphones className="h-12 w-12 mx-auto text-green-500" />
                <h3 className="font-semibold text-lg">Start Live Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with our support team in real-time
                </p>
              </div>
              <Input
                placeholder="What do you need help with? (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Button type="submit" className="w-full bg-green-500 hover:bg-green-600" disabled={startChatMutation.isPending}>
                {startChatMutation.isPending ? "Connecting..." : "Start Chat"}
              </Button>
            </form>
          ) : (
            <>
              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {activeChat.status === 'waiting' && messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="animate-pulse text-muted-foreground">
                        <p>Waiting for a support agent to join...</p>
                        <p className="text-sm mt-2">You can send a message while you wait</p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_type === 'company_user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          msg.sender_type === 'company_user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p>{msg.message}</p>
                        <p className={cn(
                          "text-xs mt-1 opacity-70",
                          msg.sender_type === 'company_user' ? "text-right" : "text-left"
                        )}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-3 border-t">
                {activeChat.status === 'closed' ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-2">This chat has ended</p>
                    <Button variant="outline" size="sm" onClick={() => refetchChat()}>
                      Start New Chat
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
                {activeChat.status !== 'closed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => closeChatMutation.mutate()}
                  >
                    End Chat
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
