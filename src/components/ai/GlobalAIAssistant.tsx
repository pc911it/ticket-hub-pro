import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Bot, Send, X, Loader2, User, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { useFloatingWidgets } from '@/contexts/FloatingWidgetsContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const pageContextMap: Record<string, string> = {
  '/admin': 'Dashboard - Overview of projects, tickets, and key metrics',
  '/admin/projects': 'Projects page - Manage construction projects',
  '/admin/clients': 'Clients page - Manage client relationships',
  '/admin/tickets': 'Tickets page - Support and work tickets',
  '/admin/bids': 'Bids page - Manage project bids and estimates',
  '/admin/invoices': 'Invoices page - Billing and payments',
  '/admin/inventory': 'Inventory page - Track materials and supplies',
  '/admin/employees': 'Employees page - Team management',
  '/admin/calendar': 'Calendar - Schedule and appointments',
  '/admin/daily-logs': 'Daily Logs - Project progress tracking',
  '/admin/permits': 'Permits - Permit tracking and management',
  '/admin/contracts': 'Contracts - Contract management',
  '/admin/equipment': 'Equipment - Equipment tracking',
  '/admin/subcontractors': 'Subcontractors - Subcontractor management',
};

export function GlobalAIAssistant() {
  const { hideWidgets } = useFloatingWidgets();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const currentPageContext = pageContextMap[location.pathname] || `Page: ${location.pathname}`;
  
  const { messages, isLoading, streamMessage, clearMessages, setMessages } = useAIAssistant({
    type: 'support',
    context: {
      currentPage: location.pathname,
      pageDescription: currentPageContext,
      platform: 'BuilderFlow Construction Management',
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `👋 Hi! I'm your AI assistant for BuilderFlow. I can help you:\n\n• Navigate and use features\n• Create projects, tickets, or bids\n• Answer questions about your data\n• Provide guidance on best practices\n\nI can see you're on the ${currentPageContext}. How can I help?`
      }]);
    }
  }, [isOpen, messages.length, currentPageContext, setMessages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    setStreamingContent('');
    
    let accumulated = '';
    await streamMessage(message, (delta) => {
      accumulated += delta;
      setStreamingContent(accumulated);
    });
    
    setStreamingContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'How do I create a new project?',
    'Explain this page',
    'What features are available?',
    'Help me get started',
  ];

  // Hide when dialogs are open (must be after all hooks)
  if (hideWidgets && !isOpen) return null;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-40 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-2 border-primary-foreground/20"
        size="icon"
        title="AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl transition-all duration-200',
        isMinimized
          ? 'bottom-40 right-6 w-72 h-14'
          : 'bottom-40 right-6 w-96 h-[500px] max-h-[80vh]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">AI Assistant</p>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">Always here to help</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4 h-[350px]">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {streamingContent && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-lg px-3 py-2 max-w-[85%] bg-muted">
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  </div>
                </div>
              )}
              
              {isLoading && !streamingContent && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick suggestions */}
            {messages.length <= 1 && !isLoading && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1 text-sm h-9"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                size="sm"
                className="h-9 w-9 p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
