import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Bot, Send, Trash2, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIChatAssistantProps {
  type?: 'support' | 'bid' | 'document' | 'summary' | 'chat';
  context?: Record<string, unknown>;
  title?: string;
  placeholder?: string;
  className?: string;
}

export function AIChatAssistant({
  type = 'chat',
  context,
  title = 'AI Assistant',
  placeholder = 'Type your message...',
  className,
}: AIChatAssistantProps) {
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, streamMessage, clearMessages } = useAIAssistant({
    type,
    context,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

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

  return (
    <Card className={cn('flex flex-col h-[500px]', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Start a conversation with AI</p>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                </div>
              </div>
            )}
            
            {isLoading && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
