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
import { Send, MessageCircle, Users, CheckCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReadReceipt {
  user_id: string;
  read_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  read_by?: ReadReceipt[];
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

  // Fetch chat messages with read receipts
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

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const commentIds = data.map(m => m.id);

        // Fetch profiles and read receipts in parallel
        const [profilesResult, receiptsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds),
          supabase
            .from('chat_read_receipts')
            .select('comment_id, user_id, read_at')
            .in('comment_id', commentIds)
        ]);

        const profiles = profilesResult.data || [];
        const receipts = receiptsResult.data || [];

        // Get profile info for receipt users
        const receiptUserIds = [...new Set(receipts.map(r => r.user_id))];
        const { data: receiptProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', receiptUserIds);

        return data.map(msg => ({
          ...msg,
          profiles: profiles.find(p => p.user_id === msg.user_id) || null,
          read_by: receipts
            .filter(r => r.comment_id === msg.id)
            .map(r => ({
              ...r,
              profiles: receiptProfiles?.find(p => p.user_id === r.user_id) || null
            }))
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

  // Mark messages as read
  const markAsRead = async (messageIds: string[]) => {
    if (!user?.id || !companyId || messageIds.length === 0) return;

    // Filter out messages the user has already read
    const typedMessages = messages as ChatMessage[] | undefined;
    const unreadIds = messageIds.filter(id => {
      const msg = typedMessages?.find(m => m.id === id);
      return msg && !msg.read_by?.some(r => r.user_id === user.id) && msg.user_id !== user.id;
    });

    if (unreadIds.length === 0) return;

    const receipts = unreadIds.map(comment_id => ({
      comment_id,
      user_id: user.id,
      company_id: companyId,
    }));

    await supabase.from('chat_read_receipts').upsert(receipts, {
      onConflict: 'comment_id,user_id',
      ignoreDuplicates: true
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !companyId) throw new Error('Not authenticated');

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

  // Scroll to bottom and mark messages as read
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    if (messages && messages.length > 0) {
      const messageIds = (messages as ChatMessage[]).map(m => m.id);
      markAsRead(messageIds);
    }
  }, [messages]);

  // Real-time subscription for messages and read receipts
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_read_receipts',
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

  const getReadReceiptInfo = (msg: ChatMessage) => {
    if (!msg.read_by || msg.read_by.length === 0) return null;
    
    // Filter out the sender's own read receipt
    const readers = msg.read_by.filter(r => r.user_id !== msg.user_id);
    if (readers.length === 0) return null;

    const names = readers
      .map(r => r.profiles?.full_name || 'Unknown')
      .slice(0, 3);
    
    const remaining = readers.length - 3;
    let text = names.join(', ');
    if (remaining > 0) {
      text += ` +${remaining} more`;
    }

    return { count: readers.length, text };
  };

  return (
    <TooltipProvider>
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
                  const readInfo = getReadReceiptInfo(msg);
                  
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
                        
                        {/* Read receipts */}
                        {isOwn && readInfo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground cursor-default">
                                <CheckCheck className="h-3 w-3 text-primary" />
                                <span>Seen by {readInfo.count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end">
                              <p className="text-xs">{readInfo.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
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
    </TooltipProvider>
  );
}
