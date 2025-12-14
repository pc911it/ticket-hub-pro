import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Building2, Paperclip, FileText, Image, X, CheckCheck, Check, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  company_id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  profiles?: { full_name: string | null; user_id: string } | null;
  companies?: { name: string } | null;
  read_by?: { user_id: string; company_id: string; company_name: string }[];
}

interface ProjectMember {
  user_id: string;
  full_name: string | null;
  company_name: string;
  company_id: string;
}

interface ProjectChatProps {
  projectId: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserCompany();
      fetchComments();
      fetchProjectMembers();
      const unsubscribe = subscribeToComments();
      const unsubscribeReadReceipts = subscribeToReadReceipts();
      return () => { 
        unsubscribe?.(); 
        unsubscribeReadReceipts?.();
      };
    }
  }, [projectId, user]);

  useEffect(() => {
    scrollToBottom();
    // Mark visible messages as read
    markMessagesAsRead();
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

  const fetchProjectMembers = async () => {
    // Get project owner company members
    const { data: project } = await supabase
      .from('projects')
      .select('company_id')
      .eq('id', projectId)
      .single();

    if (!project) return;

    // Get all company IDs (owner + partners)
    const { data: partners } = await supabase
      .from('project_companies')
      .select('company_id')
      .eq('project_id', projectId)
      .eq('status', 'accepted');

    const companyIds = [project.company_id, ...(partners?.map(p => p.company_id) || [])].filter(Boolean);

    // Get all members from these companies
    const { data: members } = await supabase
      .from('company_members')
      .select('user_id, company_id')
      .in('company_id', companyIds);

    if (!members) return;

    // Get profiles and company names
    const userIds = members.map(m => m.user_id);
    const [{ data: profiles }, { data: companies }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
      supabase.from('companies').select('id, name').in('id', companyIds)
    ]);

    const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    const memberList: ProjectMember[] = members.map(m => ({
      user_id: m.user_id,
      full_name: profileMap.get(m.user_id) || null,
      company_name: companyMap.get(m.company_id) || '',
      company_id: m.company_id
    })).filter(m => m.full_name);

    setProjectMembers(memberList);
  };

  const fetchReadReceipts = async (commentIds: string[]) => {
    if (commentIds.length === 0) return new Map();
    
    const { data } = await supabase
      .from('chat_read_receipts')
      .select('comment_id, user_id, company_id, companies:company_id(name)')
      .in('comment_id', commentIds);

    const receiptMap = new Map<string, { user_id: string; company_id: string; company_name: string }[]>();
    
    data?.forEach(receipt => {
      const existing = receiptMap.get(receipt.comment_id) || [];
      existing.push({
        user_id: receipt.user_id,
        company_id: receipt.company_id,
        company_name: (receipt.companies as any)?.name || ''
      });
      receiptMap.set(receipt.comment_id, existing);
    });

    return receiptMap;
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
      const userIds = [...new Set(data.map(c => c.user_id))];
      const commentIds = data.map(c => c.id);
      
      const [{ data: profiles }, receiptMap] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        fetchReadReceipts(commentIds)
      ]);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null,
        read_by: receiptMap.get(comment.id) || []
      }));
      
      setComments(commentsWithProfiles as Comment[]);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !userCompanyId) return;

    // Find messages not sent by current user that haven't been marked as read
    const unreadMessages = comments.filter(c => 
      c.user_id !== user.id && 
      !c.read_by?.some(r => r.user_id === user.id)
    );

    if (unreadMessages.length === 0) return;

    // Mark them as read
    const receipts = unreadMessages.map(c => ({
      comment_id: c.id,
      user_id: user.id,
      company_id: userCompanyId
    }));

    await supabase
      .from('chat_read_receipts')
      .upsert(receipts, { onConflict: 'comment_id,user_id' });
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
          const { data: comment } = await supabase
            .from('project_comments')
            .select(`*, companies:company_id(name)`)
            .eq('id', payload.new.id)
            .single();
          
          if (comment) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .eq('user_id', comment.user_id)
              .single();
            
            const commentWithProfile = {
              ...comment,
              profiles: profile || null,
              read_by: []
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

  const subscribeToReadReceipts = () => {
    const channel = supabase
      .channel(`read-receipts-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_read_receipts'
        },
        async (payload) => {
          const receipt = payload.new as any;
          
          // Fetch company name
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', receipt.company_id)
            .single();
          
          setComments(prev => prev.map(c => {
            if (c.id === receipt.comment_id) {
              return {
                ...c,
                read_by: [
                  ...(c.read_by || []),
                  {
                    user_id: receipt.user_id,
                    company_id: receipt.company_id,
                    company_name: company?.name || ''
                  }
                ]
              };
            }
            return c;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string; size: number } | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('project-chat-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-chat-files')
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setMessage(value);
    setCursorPosition(pos);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, pos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionFilter(mentionMatch[1].toLowerCase());
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionFilter('');
    }
  };

  const insertMention = (member: ProjectMember) => {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newMessage = `${beforeMention}@${member.full_name} ${textAfterCursor}`;
      setMessage(newMessage);
    }
    
    setMentionOpen(false);
    setMentionFilter('');
    inputRef.current?.focus();
  };

  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@([\w\s]+?)(?=\s@|\s|$)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionPattern.exec(text)) !== null) {
      mentions.push(match[1].trim());
    }
    
    return mentions;
  };

  const createMentionNotifications = async (mentionedNames: string[]) => {
    if (!user || !userCompanyId) return;

    // Find mentioned users
    const mentionedMembers = projectMembers.filter(m => 
      m.full_name && mentionedNames.some(name => 
        m.full_name?.toLowerCase() === name.toLowerCase()
      )
    );

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Create notifications for each mentioned user
    for (const member of mentionedMembers) {
      if (member.user_id === user.id) continue; // Don't notify self
      
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        company_id: member.company_id,
        title: 'You were mentioned',
        message: `You were mentioned in ${project?.name || 'a project'} by a team member`,
        type: 'mention',
        ticket_id: null
      });
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && !selectedFile) || !user || !userCompanyId) return;

    setLoading(true);
    setUploading(!!selectedFile);

    try {
      let fileData = null;

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      // Extract mentions before sending
      const mentions = extractMentions(message);

      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          user_id: user.id,
          company_id: userCompanyId,
          content: message.trim() || (fileData ? `Shared a file: ${fileData.name}` : ''),
          file_url: fileData?.url || null,
          file_name: fileData?.name || null,
          file_type: fileData?.type || null,
          file_size: fileData?.size || null
        });

      if (error) throw error;

      // Create notifications for mentions
      if (mentions.length > 0) {
        await createMentionNotifications(mentions);
      }

      setMessage('');
      removeSelectedFile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (type: string | null) => {
    return type?.startsWith('image/');
  };

  const renderContent = (content: string) => {
    // Highlight @mentions in the message
    const parts = content.split(/(@[\w\s]+?)(?=\s@|\s|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getReadReceiptInfo = (comment: Comment) => {
    if (!comment.read_by || comment.read_by.length === 0) return null;
    
    // Group by company
    const byCompany = comment.read_by.reduce((acc, r) => {
      if (!acc[r.company_name]) acc[r.company_name] = 0;
      acc[r.company_name]++;
      return acc;
    }, {} as Record<string, number>);

    const companyNames = Object.keys(byCompany);
    if (companyNames.length === 0) return null;

    return companyNames.join(', ');
  };

  const filteredMembers = projectMembers.filter(m => 
    m.full_name?.toLowerCase().includes(mentionFilter) &&
    m.user_id !== user?.id
  );

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
                const readInfo = isOwn ? getReadReceiptInfo(comment) : null;
                const hasBeenRead = isOwn && comment.read_by && comment.read_by.length > 0;
                
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
                        {comment.content && <p>{renderContent(comment.content)}</p>}
                        
                        {comment.file_url && (
                          <div className="mt-2">
                            {isImage(comment.file_type) ? (
                              <a href={comment.file_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={comment.file_url} 
                                  alt={comment.file_name || 'Attached image'} 
                                  className="max-w-full max-h-48 rounded-md"
                                />
                              </a>
                            ) : (
                              <a 
                                href={comment.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded border ${
                                  isOwn ? 'border-primary-foreground/30 hover:bg-primary-foreground/10' : 'border-border hover:bg-background'
                                }`}
                              >
                                <FileText className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{comment.file_name}</p>
                                  {comment.file_size && (
                                    <p className="text-xs opacity-70">{formatFileSize(comment.file_size)}</p>
                                  )}
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                        {isOwn && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                                {hasBeenRead ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 text-xs">
                              {hasBeenRead ? (
                                <div>
                                  <p className="font-medium mb-1">Seen by:</p>
                                  <p className="text-muted-foreground">{readInfo}</p>
                                </div>
                              ) : (
                                <p className="text-muted-foreground">Not yet seen</p>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeSelectedFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="relative">
          {mentionOpen && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
              {filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                  onClick={() => insertMention(member)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.company_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setMessage(prev => prev + '@');
                setMentionOpen(true);
                setMentionFilter('');
                inputRef.current?.focus();
              }}
              disabled={loading}
            >
              <AtSign className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              placeholder="Type a message... Use @ to mention"
              value={message}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
                  sendMessage();
                }
                if (e.key === 'Escape') {
                  setMentionOpen(false);
                }
              }}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || (!message.trim() && !selectedFile)}>
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
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
