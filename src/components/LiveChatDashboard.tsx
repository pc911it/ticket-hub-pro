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
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Chat {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_type: 'visitor' | 'ai' | 'agent';
  content: string;
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
        setChats(data || []);
      }
      setIsLoading(false);
    };

    fetchChats();

    // Subscribe to new chats
    const channel = supabase
      .channel('support_chats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_chats' },
        () => fetchChats()
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
          setMessages((prev) => [...prev, payload.new as Message]);
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

    // Update chat status to with_agent
    if (chat.status !== 'with_agent') {
      await supabase
        .from('support_chats')
        .update({ 
          status: 'with_agent',
          assigned_agent_id: user?.id 
        })
        .eq('id', chat.id);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedChat || isSending) return;

    setIsSending(true);
    const messageContent = inputValue;
    setInputValue('');

    try {
      const { error } = await supabase.from('support_chat_messages').insert({
        chat_id: selectedChat.id,
        sender_type: 'agent',
        sender_id: user?.id,
        content: messageContent,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {chat.visitor_name || `Visitor`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(chat.status)}
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
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedChat.visitor_name || 'Visitor'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      ID: {selectedChat.visitor_id.slice(0, 20)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedChat.status)}
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
                    placeholder="Type your response..."
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
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a chat to start responding</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
