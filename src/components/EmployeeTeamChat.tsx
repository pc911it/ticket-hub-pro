import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface EmployeeTeamChatProps {
  companyId: string;
  projectId?: string;
}

export function EmployeeTeamChat({ companyId, projectId }: EmployeeTeamChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['employee-team-chat', companyId, projectId],
    queryFn: async () => {
      const query = supabase
        .from('project_comments')
        .select(`
          id,
          content,
          user_id,
          created_at,
          company_id
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (projectId) {
        query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for users
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        return data.map(msg => ({
          ...msg,
          profiles: profiles?.find(p => p.user_id === msg.user_id) || null
        }));
      }

      return data || [];
    },
    enabled: !!companyId,
  });

  // Get online team members
  const { data: onlineAgents } = useQuery({
    queryKey: ['online-agents', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, full_name, is_online')
        .eq('company_id', companyId)
        .eq('is_online', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !companyId) throw new Error('Not authenticated');

      // Get first project for the company if no projectId provided
      let targetProjectId = projectId;
      if (!targetProjectId) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', companyId)
          .limit(1)
          .single();
        
        if (!projects?.id) throw new Error('No project found for chat');
        targetProjectId = projects.id;
      }

      const { error } = await supabase.from('project_comments').insert({
        project_id: targetProjectId,
        company_id: companyId,
        user_id: user.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['employee-team-chat'] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('employee-team-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_comments',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['employee-team-chat'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message.trim());
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="border-0 shadow-md h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-display">Team Chat</CardTitle>
          </div>
          {onlineAgents && onlineAgents.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {onlineAgents.length} online
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg: ChatMessage) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      isOwn && 'flex-row-reverse'
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        'text-xs',
                        isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {getInitials(msg.profiles?.full_name || msg.profiles?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'flex flex-col max-w-[70%]',
                      isOwn && 'items-end'
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {isOwn ? 'You' : (msg.profiles?.full_name || 'Unknown')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className={cn(
                        'rounded-lg px-3 py-2 text-sm',
                        isOwn 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSend} className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!message.trim() || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
