import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones, Send, MessageSquare, Clock, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

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
  updated_at: string;
  companies?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

export default function CompanyLiveChatsPage() {
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  // Get all active chats
  const { data: chats = [], refetch: refetchChats } = useQuery({
    queryKey: ['all-company-support-chats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_support_chats')
        .select(`
          *,
          companies:company_id(name)
        `)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch initiator names separately
      const chatsWithProfiles = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', chat.initiated_by)
            .maybeSingle();
          return {
            ...chat,
            profiles: profile || { full_name: 'Unknown' }
          } as SupportChat;
        })
      );
      
      return chatsWithProfiles;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Get messages for selected chat
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['admin-support-chat-messages', selectedChat?.id],
    queryFn: async () => {
      if (!selectedChat?.id) return [];
      const { data, error } = await supabase
        .from('company_support_chat_messages')
        .select('*')
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!selectedChat?.id,
    refetchInterval: 2000,
  });

  // Real-time subscription for new chats and messages
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_support_chats',
        },
        () => {
          refetchChats();
          // Play notification sound for new chats
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_support_chat_messages',
        },
        (payload) => {
          if (selectedChat && (payload.new as ChatMessage).chat_id === selectedChat.id) {
            refetchMessages();
          }
          // Play sound for company messages
          if ((payload.new as ChatMessage).sender_type === 'company_user') {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id, refetchChats, refetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join/Accept chat
  const joinChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from('company_support_chats')
        .update({ 
          status: 'active', 
          assigned_admin: user?.id 
        })
        .eq('id', chatId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchChats();
      toast.success("You've joined the chat");
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedChat?.id || !user?.id) throw new Error('No active chat');
      const { error } = await supabase
        .from('company_support_chat_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: user.id,
          sender_type: 'super_admin',
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
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from('company_support_chats')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', chatId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedChat(null);
      refetchChats();
      toast.success("Chat closed");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // Auto-join if not already active
    if (selectedChat?.status === 'waiting') {
      joinChatMutation.mutate(selectedChat.id);
    }
    
    sendMessageMutation.mutate(newMessage.trim());
  };

  const waitingChats = chats.filter(c => c.status === 'waiting');
  const activeChats = chats.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Headphones className="h-8 w-8" />
            Company Live Support
          </h1>
          <p className="text-muted-foreground">
            Real-time chat support with companies
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-sm">
            {waitingChats.length} Waiting
          </Badge>
          <Badge variant="default" className="text-sm">
            {activeChats.length} Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Support Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {chats.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No active chats</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        selectedChat?.id === chat.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {chat.companies?.name || 'Unknown Company'}
                          </span>
                        </div>
                        <Badge
                          variant={chat.status === 'waiting' ? 'destructive' : 'default'}
                          className="shrink-0 text-xs"
                        >
                          {chat.status === 'waiting' ? (
                            <><Clock className="h-3 w-3 mr-1" />Waiting</>
                          ) : (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {chat.subject || 'No subject'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat window */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {selectedChat.companies?.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.subject || 'Support Request'} • Started by {selectedChat.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedChat.status === 'waiting' && (
                      <Button
                        size="sm"
                        onClick={() => joinChatMutation.mutate(selectedChat.id)}
                        disabled={joinChatMutation.isPending}
                      >
                        Accept Chat
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeChatMutation.mutate(selectedChat.id)}
                    >
                      Close Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No messages yet</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.sender_type === 'super_admin' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                            msg.sender_type === 'super_admin'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p>{msg.message}</p>
                          <p className={cn(
                            "text-xs mt-1 opacity-70",
                            msg.sender_type === 'super_admin' ? "text-right" : "text-left"
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
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
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a chat to respond</p>
                <p className="text-sm">Active support requests appear on the left</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
