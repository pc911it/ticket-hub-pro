import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AIType = 'support' | 'bid' | 'document' | 'summary' | 'chat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIAssistantOptions {
  type?: AIType;
  context?: Record<string, unknown>;
}

export function useAIAssistant(options: UseAIAssistantOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: options.type || 'chat',
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context: options.context,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please contact support.');
        } else {
          toast.error(data.error);
        }
        return null;
      }

      const assistantMessage: Message = { role: 'assistant', content: data.content };
      setMessages(prev => [...prev, assistantMessage]);
      return data.content;
    } catch (error) {
      console.error('AI assistant error:', error);
      toast.error('Failed to get AI response. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, options.type, options.context]);

  const streamMessage = useCallback(async (content: string, onDelta: (text: string) => void) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: options.type || 'chat',
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            })),
            context: options.context,
          }),
        }
      );

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please contact support.');
        } else {
          toast.error(errorData.error || 'Failed to get AI response');
        }
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              onDelta(deltaContent);
            }
          } catch {
            // Partial JSON, wait for more
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      const assistantMessage: Message = { role: 'assistant', content: fullContent };
      setMessages(prev => [...prev, assistantMessage]);
      return fullContent;
    } catch (error) {
      console.error('AI stream error:', error);
      toast.error('Failed to get AI response. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, options.type, options.context]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const generateOnce = useCallback(async (prompt: string, context?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: options.type || 'chat',
          prompt,
          context: context || options.context,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data.content;
    } catch (error) {
      console.error('AI assistant error:', error);
      toast.error('Failed to get AI response. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options.type, options.context]);

  return {
    messages,
    isLoading,
    sendMessage,
    streamMessage,
    generateOnce,
    clearMessages,
    setMessages,
  };
}
