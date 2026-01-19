import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  ArrowLeft,
  HelpCircle,
  ShoppingBag,
  CreditCard,
  Settings,
  FileQuestion
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Audio context for notification sounds
let audioContext: AudioContext | null = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const playNotificationSound = async (type: 'message' | 'greeting' | 'agent') => {
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
    
    if (type === 'greeting') {
      // Friendly chime for greeting popup
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } else if (type === 'agent') {
      // Special sound when agent joins
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
      oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.15); // C#5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3); // E5
      gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Simple blip for new message
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    }
  } catch (error) {
    console.error('Audio playback error:', error);
  }
};

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

const TOPIC_KEYS = [
  { value: 'general', key: 'chat.topics.general', icon: HelpCircle },
  { value: 'order', key: 'chat.topics.order', icon: ShoppingBag },
  { value: 'billing', key: 'chat.topics.billing', icon: CreditCard },
  { value: 'technical', key: 'chat.topics.technical', icon: Settings },
  { value: 'other', key: 'chat.topics.other', icon: FileQuestion },
];

const DEPARTMENT_KEYS = [
  { value: 'sales', key: 'chat.departments.sales' },
  { value: 'support', key: 'chat.departments.support' },
  { value: 'billing', key: 'chat.departments.billing' },
  { value: 'general', key: 'chat.departments.general' },
];

export function SupportChatWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [contactMode, setContactMode] = useState<ContactMode | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [visitorId] = useState(() => {
    const stored = localStorage.getItem('support_session_id');
    if (stored) return stored;
    // Generate cryptographically secure UUID v4 for session identification
    const newId = crypto.randomUUID();
    localStorage.setItem('support_session_id', newId);
    return newId;
  });
  const [requestedAgent, setRequestedAgent] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus>('active');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  // Use sessionStorage instead of localStorage so greeting shows once per session
  const [hasInteracted, setHasInteracted] = useState(() => {
    return sessionStorage.getItem('support_has_interacted') === 'true';
  });
  
  // Topic/Order selection state
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [orderReference, setOrderReference] = useState('');
  
  // Visitor info state
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // WhatsApp Business number
  const whatsappNumber = '17864814375';

  useEffect(() => {
    console.log('Greeting check - hasInteracted:', hasInteracted, 'isOpen:', isOpen);
    
    // Clear any existing timeout
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current);
    }
    
    // Show greeting after 3 seconds if user hasn't interacted and chat is closed
    if (!hasInteracted && !isOpen) {
      console.log('Setting greeting timeout...');
      greetingTimeoutRef.current = setTimeout(() => {
        console.log('Showing greeting popup!');
        setShowGreeting(true);
        playNotificationSound('greeting');
      }, 3000); // Reduced to 3 seconds for faster popup
    }

    return () => {
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
      }
    };
  }, [hasInteracted, isOpen]);

  const handleInteraction = () => {
    setHasInteracted(true);
    sessionStorage.setItem('support_has_interacted', 'true');
    setShowGreeting(false);
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    // Small delay to ensure content is rendered
    setTimeout(scrollToBottom, 50);
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

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
          
          if (newStatus === 'with_agent' && chatStatus !== 'with_agent') {
            const agentJoinedMsg: Message = {
              id: `system_agent_joined_${Date.now()}`,
              content: t('chat.agentJoinedMessage'),
              sender: 'agent',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentJoinedMsg]);
            setRequestedAgent(false);
            playNotificationSound('agent');
            toast({
              title: t('chat.agentConnected'),
              description: t('chat.nowChattingWithAgent'),
            });
          }
          
          if (newStatus === 'closed') {
            const closedMsg: Message = {
              id: `system_closed_${Date.now()}`,
              content: t('chat.chatClosedMessage'),
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, closedMsg]);
          }
        }
      )
      .subscribe();

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
          if (newMsg.sender_type === 'agent') {
            setIsAgentTyping(false);
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (newMsg.content?.startsWith('🎉')) return prev;
              // Play sound for new agent message
              playNotificationSound('message');
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

  const getWelcomeMessage = (mode: ContactMode, topic?: string): string => {
    const topicLabel = topic ? t(`chat.topics.${topic}`) : null;
    const topicIntro = topicLabel ? t('chat.welcomeMessages.topicIntro', { topic: topicLabel }) : '';
    
    switch (mode) {
      case 'text':
        return t('chat.welcomeMessages.text', { topicIntro });
      case 'whatsapp':
        return t('chat.welcomeMessages.whatsapp', { topicIntro });
      case 'chat':
      default:
        return t('chat.welcomeMessages.chat', { topicIntro });
    }
  };

  const initiateTopicSelection = (mode: ContactMode) => {
    setContactMode(mode);
    setShowTopicSelection(true);
  };

  const startChatWithTopic = async () => {
    if (!selectedTopic) {
      toast({
        variant: 'destructive',
        title: t('chat.pleaseSelectTopic'),
        description: t('chat.letUsKnowWhatYouNeedHelpWith'),
      });
      return;
    }

    if (!visitorName.trim()) {
      toast({
        variant: 'destructive',
        title: t('chat.nameRequired'),
        description: t('chat.pleaseEnterYourName'),
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (visitorEmail && !emailRegex.test(visitorEmail.trim())) {
      toast({
        variant: 'destructive',
        title: t('chat.invalidEmail'),
        description: t('chat.pleaseEnterValidEmail'),
      });
      return;
    }

    setShowTopicSelection(false);
    
    try {
      // Use secure edge function for chat creation
      const { data, error } = await supabase.functions.invoke('validate-chat-session', {
        body: { 
          session_id: visitorId,
          action: 'create',
          visitor_name: visitorName.trim().substring(0, 100),
          visitor_email: visitorEmail.trim().substring(0, 255) || null,
          visitor_phone: visitorPhone.trim().substring(0, 20) || null,
          topic: selectedTopic,
          department: selectedDepartment || (selectedTopic === 'billing' ? 'billing' : selectedTopic === 'technical' ? 'support' : 'general'),
          order_reference: orderReference.substring(0, 50) || null,
        }
      });

      if (error) throw error;
      if (!data?.valid) throw new Error(data?.error || 'Failed to create chat');
      
      setChatId(data.chat_id);

      const welcomeMsg: Message = {
        id: 'welcome',
        content: getWelcomeMessage(contactMode!, selectedTopic),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        variant: 'destructive',
        title: t('chat.error'),
        description: t('chat.failedToStartChat'),
      });
    }
  };

  const startChat = async (mode: ContactMode) => {
    initiateTopicSelection(mode);
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
      let currentChatId = chatId;
      if (!currentChatId) {
        // Use secure edge function for chat creation
        const { data, error } = await supabase.functions.invoke('validate-chat-session', {
          body: { 
            session_id: visitorId,
            action: 'create',
            topic: selectedTopic || 'general',
            department: selectedDepartment || 'general',
          }
        });

        if (error) throw error;
        if (!data?.valid) throw new Error(data?.error || 'Failed to create chat');
        
        currentChatId = data.chat_id;
        setChatId(currentChatId);
      }

      if (chatStatus === 'with_agent') {
        // Use secure edge function for sending messages
        const { data, error: messageError } = await supabase.functions.invoke('validate-chat-session', {
          body: { 
            session_id: visitorId,
            action: 'send_message',
            message: messageText,
          }
        });

        if (messageError) throw messageError;
        if (!data?.valid) throw new Error(data?.error || 'Failed to send message');
          
      } else {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('support-chat', {
          body: { message: messageText, chatId: currentChatId, visitorId },
        });

        if (functionError) throw functionError;

        if (functionData?.error) {
          throw new Error(functionData.error);
        }

        if (functionData.response && !functionData.agentHandled) {
          const aiMessage: Message = {
            id: `ai_${Date.now()}`,
            content: functionData.response,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          playNotificationSound('message');
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: t('chat.connectionErrorMessage'),
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
        content: t('chat.agentNotifiedMessage'),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);

      toast({
        title: t('chat.agentRequested'),
        description: t('chat.agentWillJoinShortly'),
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
    if (showTopicSelection) {
      setShowTopicSelection(false);
      setContactMode(null);
      setSelectedTopic('');
      setSelectedDepartment('');
      setOrderReference('');
      setVisitorName('');
      setVisitorEmail('');
      setVisitorPhone('');
    } else {
      setContactMode(null);
      setMessages([]);
      setChatId(null);
      setRequestedAgent(false);
      setChatStatus('active');
      setSelectedTopic('');
      setSelectedDepartment('');
      setOrderReference('');
      setVisitorName('');
      setVisitorEmail('');
      setVisitorPhone('');
    }
  };

  const getModeTitle = () => {
    if (showTopicSelection) return t('chat.howCanWeHelp');
    switch (contactMode) {
      case 'text':
        return t('chat.textSupport');
      case 'whatsapp':
        return t('chat.whatsappChat');
      case 'chat':
      default:
        return t('chat.liveChat');
    }
  };

  const getModeSubtitle = () => {
    if (showTopicSelection) return t('chat.tellUsWhatYouNeed');
    if (chatStatus === 'with_agent') return t('chat.speakingWithAgent');
    if (requestedAgent || chatStatus === 'waiting_agent') return t('chat.waitingForAgent');
    if (chatStatus === 'closed') return t('chat.chatEnded');
    switch (contactMode) {
      case 'text':
        return t('chat.webBasedMessaging');
      case 'whatsapp':
        return t('chat.whatsappIntegration');
      case 'chat':
      default:
        return t('chat.aiPoweredAssistance');
    }
  };

  // Closed state - floating button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showGreeting && !showContactOptions && (
          <div className="animate-slide-up max-w-[280px]">
            <div className="bg-background rounded-2xl shadow-xl border p-4 relative">
              <button
                onClick={() => setShowGreeting(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('chat.needHelp')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('chat.greeting')}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      handleInteraction();
                      setIsOpen(true);
                    }}
                  >
                    {t('chat.startChat')}
                  </Button>
                </div>
              </div>
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-background border-b border-r rotate-45 transform" />
            </div>
          </div>
        )}

        {showContactOptions && (
          <div className="flex flex-col gap-2 animate-slide-up">
            <Button
              onClick={() => {
                handleInteraction();
                openWhatsApp();
              }}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg"
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5 mr-2" />
              {t('chat.whatsapp')}
            </Button>
            <Button
              onClick={() => {
                handleInteraction();
                setIsOpen(true);
                setShowContactOptions(false);
                initiateTopicSelection('text');
              }}
              variant="outline"
              className="bg-background shadow-lg"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              {t('chat.textUs')}
            </Button>
            <Button
              onClick={() => {
                handleInteraction();
                setIsOpen(true);
                setShowContactOptions(false);
                initiateTopicSelection('chat');
              }}
              className="shadow-lg"
              size="lg"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              {t('chat.liveChat')}
            </Button>
          </div>
        )}
        
        <div className="relative">
          {showGreeting && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
            </span>
          )}
          <Button
            onClick={() => {
              handleInteraction();
              setShowContactOptions(!showContactOptions);
            }}
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
      </div>
    );
  }

  // Open state - show chat interface
  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] shadow-2xl border-0 overflow-hidden animate-scale-in">
      <CardHeader className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(contactMode || showTopicSelection) && (
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
        {/* Contact mode selection */}
        {!contactMode && !showTopicSelection && (
          <div className="p-6 space-y-4">
            <p className="text-center text-muted-foreground mb-4">
              {t('chat.howWouldYouLikeToContactUs')}
            </p>
            <Button
              className="w-full justify-start"
              size="lg"
              onClick={() => startChat('chat')}
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{t('chat.liveChat')}</div>
                <div className="text-xs opacity-70">{t('chat.aiPoweredInstantResponses')}</div>
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
                <div className="font-medium">{t('chat.textUs')}</div>
                <div className="text-xs opacity-70">{t('chat.webBasedMessaging')}</div>
              </div>
            </Button>
            <Button
              className="w-full justify-start bg-[#25D366] hover:bg-[#128C7E] text-white"
              size="lg"
              onClick={openWhatsApp}
            >
              <WhatsAppIcon className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{t('chat.whatsapp')}</div>
                <div className="text-xs opacity-90">{t('chat.opensWhatsappApp')}</div>
              </div>
            </Button>
          </div>
        )}

        {/* Topic Selection */}
        {showTopicSelection && (
          <ScrollArea className="h-[450px]">
            <div className="p-6 space-y-4">
              {/* Visitor Info Section */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-sm font-medium">{t('chat.yourInformation')}</Label>
                <div className="space-y-2">
                  <Input
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder={t('chat.yourName')}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder={t('chat.emailOptional')}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder={t('chat.phoneOptional')}
                    maxLength={20}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">{t('chat.whatDoYouNeedHelpWith')}</Label>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  {TOPIC_KEYS.map((topic) => {
                    const Icon = topic.icon;
                    const isSelected = selectedTopic === topic.value;
                    return (
                      <button
                        key={topic.value}
                        onClick={() => setSelectedTopic(topic.value)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-medium">{t(topic.key)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            {selectedTopic === 'order' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('chat.orderNumberOptional')}</Label>
                <Input
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  placeholder={t('chat.orderNumberPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('chat.orderNumberHelp')}
                </p>
              </div>
            )}

            {selectedTopic && selectedTopic !== 'order' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('chat.departmentOptional')}</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('chat.autoRouteToTeam')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_KEYS.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {t(dept.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={startChatWithTopic}
                disabled={!selectedTopic || !visitorName.trim()}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {t('chat.startChat')}
              </Button>
            </div>
          </ScrollArea>
        )}

        {/* Chat interface */}
        {contactMode && !showTopicSelection && (
          <>
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
                    {t('chat.liveAgent')}
                  </Button>
                )}
                {(requestedAgent || chatStatus === 'waiting_agent') && (
                  <div className="flex-1 text-xs text-center text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                    {t('chat.connectingToAgent')}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={openWhatsApp}
                >
                  <WhatsAppIcon className="h-4 w-4 mr-1" />
                  {t('chat.whatsapp')}
                </Button>
              </div>
            )}
            
            {chatStatus === 'with_agent' && (
              <div className="p-3 bg-green-50 border-b border-green-100 text-green-800 text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{t('chat.connectedWithAgent')}</span>
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
                  <p className="text-sm text-muted-foreground mb-2">{t('chat.thisChartHasEnded')}</p>
                  <Button size="sm" onClick={handleBack}>
                    {t('chat.startNewChat')}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={chatStatus === 'with_agent' ? t('chat.replyToAgent') : t('chat.typeYourMessage')}
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
