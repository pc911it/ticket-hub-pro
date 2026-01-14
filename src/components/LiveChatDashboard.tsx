import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Globe,
  Volume2,
  VolumeX,
  Bell,
  Ticket,
  UserPlus,
  ArrowRightLeft,
  PhoneOff,
  Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Global audio context that persists
let audioContext: AudioContext | null = null;

// Initialize audio context on first user interaction
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Notification sound using Web Audio API
const playNotificationSound = async (type: 'newChat' | 'newMessage') => {
  try {
    const ctx = initAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    
    if (type === 'newChat') {
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    }
    
    console.log('🔊 Playing notification sound:', type);
  } catch (error) {
    console.error('Audio playback error:', error);
  }
};

const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showBrowserNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-notification',
    });
  }
};

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
  topic: string | null;
  department: string | null;
  order_reference: string | null;
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

interface Agent {
  id: string;
  user_id: string;
  full_name: string;
}

const DEPARTMENTS = [
  { value: 'sales', label: 'Sales', color: 'bg-blue-100 text-blue-800' },
  { value: 'support', label: 'Technical Support', color: 'bg-purple-100 text-purple-800' },
  { value: 'billing', label: 'Billing', color: 'bg-green-100 text-green-800' },
  { value: 'general', label: 'General Inquiry', color: 'bg-gray-100 text-gray-800' },
];

export function LiveChatDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('chat_sound_enabled');
    return stored !== 'false';
  });
  
  // Dialog states
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [transferDepartment, setTransferDepartment] = useState('');
  const [transferAgentId, setTransferAgentId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [endReason, setEndReason] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fetch agents for transfer
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, user_id, full_name');
      if (data) setAgents(data as Agent[]);
    };
    fetchAgents();
  }, []);

  // Subscribe to ALL new messages
  useEffect(() => {
    const channel = supabase
      .channel('all_chat_messages_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          if (newMsg.sender_type === 'visitor') {
            const currentSelectedChat = selectedChatRef.current;
            
            if (!currentSelectedChat || currentSelectedChat.id !== newMsg.chat_id) {
              setUnreadCounts(prev => ({
                ...prev,
                [newMsg.chat_id]: (prev[newMsg.chat_id] || 0) + 1
              }));
              
              if (soundEnabled) {
                playNotificationSound('newMessage');
              }
              
              toast({
                title: '💬 New Message',
                description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? '...' : ''),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, toast]);

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

    const channel = supabase
      .channel('support_chats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_chats' },
        (payload) => {
          fetchChats();
          
          if (payload.eventType === 'INSERT') {
            if (soundEnabled) {
              playNotificationSound('newChat');
            }
            showBrowserNotification('New Chat', 'A new visitor has started a chat');
            toast({
              title: '💬 New Chat',
              description: 'A new visitor has started a conversation',
            });
          } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'waiting_agent') {
            if (soundEnabled) {
              playNotificationSound('newChat');
            }
            showBrowserNotification('Agent Requested', 'A visitor is waiting for a live agent');
            toast({
              title: '🔔 Agent Requested',
              description: 'A visitor is waiting for a live agent',
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, toast]);

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

      if (!error && data) {
        setMessages(data as Message[]);
      }
    };

    fetchMessages();
    setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));

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
          
          if (newMsg.sender_type === 'visitor') {
            if (soundEnabled) {
              playNotificationSound('newMessage');
            }
            
            if (!document.hasFocus()) {
              showBrowserNotification('New Message', newMsg.content.substring(0, 50));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, soundEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const joinChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setUnreadCounts(prev => ({ ...prev, [chat.id]: 0 }));

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

        await supabase
          .from('support_chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedChat.id);
      } else {
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

  const handleTransfer = async () => {
    if (!selectedChat) return;

    try {
      const updates: any = { 
        status: 'waiting_agent',
        transferred_from: user?.id,
        transfer_reason: transferReason,
        updated_at: new Date().toISOString(),
      };

      if (transferDepartment) {
        updates.department = transferDepartment;
      }

      if (transferAgentId && transferAgentId !== 'queue') {
        updates.assigned_agent_id = transferAgentId;
        updates.status = 'with_agent';
      } else {
        updates.assigned_agent_id = null;
      }

      await supabase
        .from('support_chats')
        .update(updates)
        .eq('id', selectedChat.id);

      // Add system message about transfer
      await supabase
        .from('support_chat_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_type: 'ai',
          content: `Chat transferred to ${transferDepartment ? DEPARTMENTS.find(d => d.value === transferDepartment)?.label : 'another agent'}. ${transferReason ? `Reason: ${transferReason}` : ''}`,
        });

      setSelectedChat(null);
      setShowTransferDialog(false);
      setTransferDepartment('');
      setTransferAgentId('');
      setTransferReason('');

      toast({
        title: '✅ Chat transferred',
        description: transferAgentId && transferAgentId !== 'queue' 
          ? 'Chat assigned to specific agent' 
          : 'Chat returned to queue for next available agent',
      });
    } catch (error) {
      console.error('Error transferring chat:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to transfer chat' });
    }
  };

  const handleEndChat = async () => {
    if (!selectedChat) return;

    try {
      await supabase
        .from('support_chats')
        .update({ 
          status: 'closed',
          ended_at: new Date().toISOString(),
          ended_by: user?.id,
        })
        .eq('id', selectedChat.id);

      // Add closing message
      await supabase
        .from('support_chat_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_type: 'agent',
          sender_id: user?.id,
          content: endReason || 'This chat has been ended. Thank you for contacting us!',
        });

      setSelectedChat(null);
      setShowEndDialog(false);
      setEndReason('');

      toast({
        title: '✅ Chat ended',
        description: 'The conversation has been closed.',
      });
    } catch (error) {
      console.error('Error ending chat:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to end chat' });
    }
  };

  const convertToTicket = async (chat: Chat) => {
    try {
      const { data: chatMessages } = await supabase
        .from('support_chat_messages')
        .select('content, sender_type, created_at')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true })
        .limit(5);

      const conversationSummary = chatMessages
        ?.map(m => `[${m.sender_type}]: ${m.content}`)
        .join('\n') || 'Chat conversation';

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          subject: `${chat.topic ? `[${chat.topic}] ` : ''}Chat from ${chat.visitor_phone || chat.visitor_name || 'Visitor'} via ${chat.channel}`,
          description: conversationSummary.substring(0, 1000),
          status: 'open',
          priority: 'medium',
          category: 'chat',
          department: chat.department,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '🎫 Ticket created',
        description: `Ticket #${ticket.id.slice(0, 8)} created from chat.`,
      });

      window.location.href = '/admin/chat-tickets';
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create ticket from chat',
      });
    }
  };

  const toggleSound = () => {
    initAudioContext();
    
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('chat_sound_enabled', String(newValue));
    
    if (newValue) {
      playNotificationSound('newMessage');
    }
    
    toast({
      title: newValue ? '🔊 Sound enabled' : '🔇 Sound muted',
      description: newValue ? 'You will hear notifications' : 'Notifications are muted',
    });
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

  const getDepartmentBadge = (department: string | null) => {
    if (!department) return null;
    const dept = DEPARTMENTS.find(d => d.value === department);
    if (!dept) return null;
    return (
      <Badge variant="outline" className={dept.color}>
        {dept.label}
      </Badge>
    );
  };

  const getVisitorDisplay = (chat: Chat) => {
    if (chat.visitor_phone) {
      return chat.visitor_phone;
    }
    return chat.visitor_name || 'Visitor';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Chat List */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Live Chats
                {chats.filter(c => c.status === 'waiting_agent').length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {chats.filter(c => c.status === 'waiting_agent').length} waiting
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    initAudioContext();
                    playNotificationSound('newChat');
                  }}
                  className="text-xs"
                  title="Test notification sound"
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
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
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {chat.channel === 'sms' ? (
                              <Phone className="h-4 w-4 text-primary" />
                            ) : chat.channel === 'whatsapp' ? (
                              <WhatsAppIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <User className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          {unreadCounts[chat.id] > 0 && selectedChat?.id !== chat.id && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                              {unreadCounts[chat.id] > 9 ? '9+' : unreadCounts[chat.id]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            {getVisitorDisplay(chat)}
                            {unreadCounts[chat.id] > 0 && selectedChat?.id !== chat.id && (
                              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(chat.status)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getChannelBadge(chat.channel)}
                      {getDepartmentBadge(chat.department)}
                      {chat.topic && (
                        <Badge variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {chat.topic}
                        </Badge>
                      )}
                      {chat.order_reference && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          Order: {chat.order_reference}
                        </Badge>
                      )}
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getChannelBadge(selectedChat.channel)}
                        {getDepartmentBadge(selectedChat.department)}
                        {selectedChat.topic && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {selectedChat.topic}
                          </Badge>
                        )}
                        {selectedChat.order_reference && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                            Order: {selectedChat.order_reference}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedChat.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => convertToTicket(selectedChat)}
                      title="Convert to support ticket"
                    >
                      <Ticket className="h-4 w-4 mr-1" />
                      Ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTransferDialog(true)}
                      title="Transfer to another agent or department"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-1" />
                      Transfer
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowEndDialog(true)}
                    >
                      <PhoneOff className="h-4 w-4 mr-1" />
                      End Chat
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

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Department</Label>
              <Select value={transferDepartment} onValueChange={setTransferDepartment}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transfer To</Label>
              <Select value={transferAgentId} onValueChange={setTransferAgentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select agent or queue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Return to Queue (Next Available)</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.user_id}>
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Why are you transferring this chat?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Chat Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneOff className="h-5 w-5" />
              End Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will close the chat and notify the visitor. You can optionally add a closing message.
            </p>
            <div>
              <Label>Closing Message (optional)</Label>
              <Textarea
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                placeholder="Thank you for contacting us! Is there anything else I can help you with?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndChat}>
              <PhoneOff className="h-4 w-4 mr-2" />
              End Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
