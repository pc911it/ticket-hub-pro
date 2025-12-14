import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  company_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
  companies?: { name: string } | null;
}

interface ProjectChatProps {
  projectId: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserCompany();
      fetchComments();
      subscribeToComments();
    }
  }, [projectId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchUserCompany = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setUserCompanyId(data.company_id);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('project_comments')
      .select(`
        *,
        companies:company_id(name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null
      }));
      
      setComments(commentsWithProfiles as Comment[]);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`project-comments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          // Fetch the full comment with joins
          const { data: comment } = await supabase
            .from('project_comments')
            .select(`*, companies:company_id(name)`)
            .eq('id', payload.new.id)
            .single();
          
          if (comment) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .eq('user_id', comment.user_id)
              .single();
            
            const commentWithProfile = {
              ...comment,
              profiles: profile || null
            } as Comment;
            
            setComments(prev => [...prev, commentWithProfile]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !userCompanyId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          user_id: user.id,
          company_id: userCompanyId,
          content: message.trim()
        });

      if (error) throw error;
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Project Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
          {comments.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isOwn = comment.user_id === user?.id;
                return (
                  <div
                    key={comment.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                        {getInitials(comment.profiles?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {comment.profiles?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {comment.companies?.name}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {comment.content}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}