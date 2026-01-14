import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  User, 
  Bot, 
  Clock, 
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface Chat {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  channel: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_type: 'visitor' | 'ai' | 'agent';
  sender_id: string | null;
  content: string;
  channel: string | null;
  created_at: string;
}

export function LiveChatDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch active chats
  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .in('status', ['active', 'waiting_agent', 'with_agent'])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        setChats((data || []) as Chat[]);
      }
      setIsLoading(false);
    };

    fetchChats();

    // Subscribe to new chats and updates
    const channel = supabase
      .channel('support_chats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_chats' },
        (payload) => {
          fetchChats();
          // Play sound for new waiting chats
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && (payload.new as any).status === 'waiting_agent')) {
            // Could add audio notification here
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages((data || []) as Message[]);
      }
    };

    fetchMessages();

    // Clear unread count for this chat
    setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_messages_${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_messages',
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // If message is from visitor, increment unread if not viewing this chat
          if (newMsg.sender_type === 'visitor') {
            // Could add notification sound here
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const joinChat = async (chat: Chat) => {
    setSelectedChat(chat);
    
    // Clear unread count
    setUnreadCounts(prev => ({ ...prev, [chat.id]: 0 }));

    // Update chat status to with_agent if not already
    if (chat.status !== 'with_agent') {
      const { error } = await supabase
        .from('support_chats')
        .update({ 
          status: 'with_agent',
          assigned_agent_id: user?.id 
        })
        .eq('id', chat.id);

      if (error) {
        console.error('Error joining chat:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to join chat',
        });
        return;
      }

      toast({
        title: 'Chat joined',
        description: 'You are now handling this conversation.',
      });
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedChat || isSending) return;

    setIsSending(true);
    const messageContent = inputValue;
    setInputValue('');

    try {
      // For web chats, save directly to database
      if (selectedChat.channel === 'web') {
        const { error } = await supabase
          .from('support_chat_messages')
          .insert({
            chat_id: selectedChat.id,
            sender_type: 'agent',
            sender_id: user?.id,
            content: messageContent,
          });

        if (error) throw error;

        // Update chat timestamp
        await supabase
          .from('support_chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedChat.id);
      } else {
        // For SMS/WhatsApp, use edge function
        const { data, error } = await supabase.functions.invoke('send-chat-reply', {
          body: {
            chatId: selectedChat.id,
            message: messageContent,
            senderId: user?.id,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send message',
      });
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const transferChat = async (chatId: string) => {
    try {
      await supabase
        .from('support_chats')
        .update({ 
          status: 'waiting_agent',
          assigned_agent_id: null 
        })
        .eq('id', chatId);

      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }

      toast({
        title: 'Chat transferred',
        description: 'The chat is now available for other agents.',
      });
    } catch (error) {
      console.error('Error transferring chat:', error);
    }
  };

  const closeChat = async (chatId: string) => {
    try {
      await supabase
        .from('support_chats')
        .update({ status: 'closed' })
        .eq('id', chatId);

      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }

      toast({
        title: 'Chat closed',
        description: 'The conversation has been closed.',
      });
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_agent':
        return <Badge variant="destructive" className="animate-pulse">Waiting</Badge>;
      case 'with_agent':
        return <Badge variant="default">Active</Badge>;
      default:
        return <Badge variant="secondary">AI Chat</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'sms':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Phone className="h-3 w-3 mr-1" />
            SMS
          </Badge>
        );
      case 'whatsapp':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <WhatsAppIcon className="h-3 w-3 mr-1" />
            WhatsApp
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Globe className="h-3 w-3 mr-1" />
            Web
          </Badge>
        );
    }
  };

  const getVisitorDisplay = (chat: Chat) => {
    if (chat.visitor_phone) {
      return chat.visitor_phone;
    }
    return chat.visitor_name || 'Visitor';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Chat List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Chats
            {chats.filter(c => c.status === 'waiting_agent').length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {chats.filter(c => c.status === 'waiting_agent').length} waiting
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active chats</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => joinChat(chat)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {chat.channel === 'sms' ? (
                          <Phone className="h-4 w-4 text-primary" />
                        ) : chat.channel === 'whatsapp' ? (
                          <WhatsAppIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {getVisitorDisplay(chat)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(chat.status)}
                  </div>
                  <div className="flex gap-1">
                    {getChannelBadge(chat.channel)}
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedChat ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedChat.channel === 'whatsapp' ? 'bg-green-100' : 
                    selectedChat.channel === 'sms' ? 'bg-blue-100' : 'bg-primary/10'
                  }`}>
                    {selectedChat.channel === 'sms' ? (
                      <Phone className="h-5 w-5 text-blue-600" />
                    ) : selectedChat.channel === 'whatsapp' ? (
                      <WhatsAppIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {getVisitorDisplay(selectedChat)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getChannelBadge(selectedChat.channel)}
                      {selectedChat.visitor_phone && selectedChat.channel === 'web' && (
                        <span className="text-xs text-muted-foreground">
                          {selectedChat.visitor_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedChat.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transferChat(selectedChat.id)}
                    title="Transfer to another agent"
                  >
                    Transfer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeChat(selectedChat.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${
                        message.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.sender_type !== 'agent' && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          message.sender_type === 'visitor' ? 'bg-secondary' : 'bg-primary/10'
                        }`}>
                          {message.sender_type === 'visitor' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          message.sender_type === 'agent'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : message.sender_type === 'visitor'
                            ? 'bg-secondary rounded-bl-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_type === 'agent' 
                            ? 'text-primary-foreground/60' 
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {message.sender_type === 'agent' && (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Reply via ${selectedChat.channel === 'sms' ? 'SMS' : selectedChat.channel === 'whatsapp' ? 'WhatsApp' : 'chat'}...`}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isSending || !inputValue.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {(selectedChat.channel === 'sms' || selectedChat.channel === 'whatsapp') && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Your reply will be sent via {selectedChat.channel === 'sms' ? 'SMS' : 'WhatsApp'} to {selectedChat.visitor_phone}
                  </p>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a chat to start responding</p>
              <p className="text-sm mt-2">
                Chats from Web, SMS, and WhatsApp appear here
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
