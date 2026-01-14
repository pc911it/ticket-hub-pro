import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  X, 
  Send, 
  Phone, 
  Loader2, 
  User, 
  Bot, 
  Headphones,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'visitor' | 'ai' | 'agent';
  timestamp: Date;
}

type ChatStatus = 'active' | 'waiting_agent' | 'with_agent' | 'closed';

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

type ContactMode = 'chat' | 'text' | 'whatsapp';

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [contactMode, setContactMode] = useState<ContactMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [visitorId] = useState(() => {
    const stored = localStorage.getItem('support_visitor_id');
    if (stored) return stored;
    const newId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('support_visitor_id', newId);
    return newId;
  });
  const [requestedAgent, setRequestedAgent] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus>('active');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Configure your WhatsApp Business number here (format: country code + number, no + sign)
  const whatsappNumber = '14155238886'; // Your WhatsApp Business number

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Subscribe to chat status changes and new messages when chatId exists
  useEffect(() => {
    if (!chatId) return;

    // Subscribe to chat status changes
    const statusChannel = supabase
      .channel(`chat_status_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_chats',
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status as ChatStatus;
          setChatStatus(newStatus);
          
          // Notify user when agent joins
          if (newStatus === 'with_agent' && chatStatus !== 'with_agent') {
            const agentJoinedMsg: Message = {
              id: `system_agent_joined_${Date.now()}`,
              content: "🎉 A support agent has joined the chat! You're now speaking directly with our team.",
              sender: 'agent',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentJoinedMsg]);
            setRequestedAgent(false);
            toast({
              title: 'Agent connected',
              description: 'You are now chatting with a live agent.',
            });
          }
          
          if (newStatus === 'closed') {
            const closedMsg: Message = {
              id: `system_closed_${Date.now()}`,
              content: "This chat has been closed. Thank you for contacting us! Start a new chat if you need more help.",
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, closedMsg]);
          }
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`chat_messages_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add agent messages (AI and visitor messages are added locally)
          if (newMsg.sender_type === 'agent') {
            setIsAgentTyping(false);
            setMessages((prev) => {
              // Avoid duplicates and system messages
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (newMsg.content?.startsWith('🎉')) return prev; // Skip join message duplicates
              return [
                ...prev,
                {
                  id: newMsg.id,
                  content: newMsg.content,
                  sender: 'agent',
                  timestamp: new Date(newMsg.created_at),
                },
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [chatId, chatStatus, toast]);

  const getWelcomeMessage = (mode: ContactMode): string => {
    switch (mode) {
      case 'text':
        return "Hi! 👋 You're in Text Mode. Type your message and our team will respond here. Ask us anything about TicketPro!";
      case 'whatsapp':
        return "Hi! 👋 You're chatting via WhatsApp integration. Send your message and we'll respond right here!";
      case 'chat':
      default:
        return "Hi! 👋 I'm here to help you learn about TicketPro. Ask me anything about our features, pricing, or how we can help your business!";
    }
  };

  const startChat = async (mode: ContactMode) => {
    setContactMode(mode);
    
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .insert({ visitor_id: visitorId })
        .select()
        .single();

      if (error) throw error;
      setChatId(data.id);

      // Add welcome message based on mode
      const welcomeMsg: Message = {
        id: 'welcome',
        content: getWelcomeMessage(mode),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start chat. Please try again.',
      });
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue,
      sender: 'visitor',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Start chat if not already started
      let currentChatId = chatId;
      if (!currentChatId) {
        const { data, error } = await supabase
          .from('support_chats')
          .insert({ visitor_id: visitorId })
          .select()
          .single();

        if (error) throw error;
        currentChatId = data.id;
        setChatId(currentChatId);
      }

      // If agent is connected, just save message to database (no AI)
      if (chatStatus === 'with_agent') {
        const { error: messageError } = await supabase
          .from('support_chat_messages')
          .insert({
            chat_id: currentChatId,
            sender_type: 'visitor',
            content: messageText,
          });

        if (messageError) throw messageError;
        
        // Update chat timestamp to trigger notification
        await supabase
          .from('support_chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentChatId);
          
      } else {
        // No agent yet, use AI
        const { data: functionData, error: functionError } = await supabase.functions.invoke('support-chat', {
          body: { message: messageText, chatId: currentChatId, visitorId },
        });

        if (functionError) throw functionError;

        if (functionData?.error) {
          throw new Error(functionData.error);
        }

        // Only show AI response if not agent-handled
        if (functionData.response && !functionData.agentHandled) {
          const aiMessage: Message = {
            id: `ai_${Date.now()}`,
            content: functionData.response,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "I'm having trouble connecting right now. Would you like to speak with a live agent or contact us via WhatsApp?",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLiveAgent = async () => {
    if (!chatId) return;

    try {
      await supabase
        .from('support_chats')
        .update({ status: 'waiting_agent' })
        .eq('id', chatId);

      setRequestedAgent(true);
      const agentMessage: Message = {
        id: `system_${Date.now()}`,
        content: "I've notified our team. A live agent will join shortly. In the meantime, feel free to continue chatting with me!",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      toast({
        title: 'Agent requested',
        description: 'A support agent will join your chat shortly.',
      });
    } catch (error) {
      console.error('Error requesting agent:', error);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent("Hi! I have a question about TicketPro.");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBack = () => {
    setContactMode(null);
    setMessages([]);
    setChatId(null);
    setRequestedAgent(false);
    setChatStatus('active');
  };

  const getModeTitle = () => {
    switch (contactMode) {
      case 'text':
        return 'Text Support';
      case 'whatsapp':
        return 'WhatsApp Chat';
      case 'chat':
      default:
        return 'Live Chat';
    }
  };

  const getModeSubtitle = () => {
    if (chatStatus === 'with_agent') return '🟢 Speaking with agent';
    if (requestedAgent || chatStatus === 'waiting_agent') return '⏳ Waiting for agent...';
    if (chatStatus === 'closed') return 'Chat ended';
    switch (contactMode) {
      case 'text':
        return 'Web-based messaging';
      case 'whatsapp':
        return 'WhatsApp integration';
      case 'chat':
      default:
        return 'AI-powered assistance';
    }
  };

  // Closed state - show floating button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showContactOptions && (
          <div className="flex flex-col gap-2 animate-slide-up">
            <Button
              onClick={openWhatsApp}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg"
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={() => {
                setIsOpen(true);
                setShowContactOptions(false);
                startChat('text');
              }}
              variant="outline"
              className="bg-background shadow-lg"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Text Us
            </Button>
            <Button
              onClick={() => {
                setIsOpen(true);
                setShowContactOptions(false);
                startChat('chat');
              }}
              className="shadow-lg"
              size="lg"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Live Chat
            </Button>
          </div>
        )}
        <Button
          onClick={() => setShowContactOptions(!showContactOptions)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl hover:scale-105 transition-transform"
        >
          {showContactOptions ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>
    );
  }

  // Open state - show chat interface
  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] shadow-2xl border-0 overflow-hidden animate-scale-in">
      <CardHeader className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {contactMode && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              {contactMode === 'text' ? (
                <Phone className="h-5 w-5" />
              ) : contactMode === 'whatsapp' ? (
                <WhatsAppIcon className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{getModeTitle()}</CardTitle>
              <p className="text-xs text-primary-foreground/70">
                {getModeSubtitle()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Contact mode selection (if not selected) */}
        {!contactMode && (
          <div className="p-6 space-y-4">
            <p className="text-center text-muted-foreground mb-4">
              How would you like to contact us?
            </p>
            <Button
              className="w-full justify-start"
              size="lg"
              onClick={() => startChat('chat')}
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Live Chat</div>
                <div className="text-xs opacity-70">AI-powered instant responses</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="lg"
              onClick={() => startChat('text')}
            >
              <Phone className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Text Us</div>
                <div className="text-xs opacity-70">Web-based messaging</div>
              </div>
            </Button>
            <Button
              className="w-full justify-start bg-[#25D366] hover:bg-[#128C7E] text-white"
              size="lg"
              onClick={openWhatsApp}
            >
              <WhatsAppIcon className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">WhatsApp</div>
                <div className="text-xs opacity-90">Opens WhatsApp app</div>
              </div>
            </Button>
          </div>
        )}

        {/* Chat interface */}
        {contactMode && (
          <>
            {/* Quick actions - hide when agent is connected */}
            {chatStatus !== 'with_agent' && chatStatus !== 'closed' && (
              <div className="flex gap-2 p-3 bg-muted/50 border-b">
                {!requestedAgent && chatStatus !== 'waiting_agent' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={requestLiveAgent}
                  >
                    <Headphones className="h-4 w-4 mr-1" />
                    Live Agent
                  </Button>
                )}
                {(requestedAgent || chatStatus === 'waiting_agent') && (
                  <div className="flex-1 text-xs text-center text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                    Connecting to agent...
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={openWhatsApp}
                >
                  <WhatsAppIcon className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            )}
            
            {/* Agent connected banner */}
            {chatStatus === 'with_agent' && (
              <div className="p-3 bg-green-50 border-b border-green-100 text-green-800 text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Connected with a support agent</span>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.sender === 'visitor' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender !== 'visitor' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.sender === 'agent' ? 'bg-green-100' : 'bg-primary/10'
                      }`}>
                        {message.sender === 'agent' ? (
                          <User className="h-4 w-4 text-green-600" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        message.sender === 'visitor'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : message.sender === 'agent'
                          ? 'bg-green-100 text-green-900 rounded-bl-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    {message.sender === 'visitor' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      chatStatus === 'with_agent' ? 'bg-green-100' : 'bg-primary/10'
                    }`}>
                      {chatStatus === 'with_agent' ? (
                        <User className="h-4 w-4 text-green-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className={`rounded-2xl rounded-bl-md px-4 py-2 ${
                      chatStatus === 'with_agent' ? 'bg-green-100' : 'bg-muted'
                    }`}>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t bg-background">
              {chatStatus === 'closed' ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">This chat has ended</p>
                  <Button size="sm" onClick={handleBack}>
                    Start New Chat
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={chatStatus === 'with_agent' ? 'Reply to agent...' : 'Type your message...'}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
