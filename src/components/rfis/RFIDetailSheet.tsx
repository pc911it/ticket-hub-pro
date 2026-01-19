import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileQuestion, Clock, CheckCircle, Send, MessageSquare, XCircle,
  Upload, Paperclip, User, Calendar, FileText, AlertCircle, Loader2, Download
} from 'lucide-react';
import { SignedFileLink } from '@/components/SignedFile';

interface RFI {
  id: string;
  rfi_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  submitted_at: string | null;
  created_at: string;
  drawing_reference: string | null;
  spec_reference: string | null;
  response: string | null;
  response_at: string | null;
  approval_status: string | null;
  notes: string | null;
  project_id: string | null;
  ticket_id: string | null;
  projects?: { name: string } | null;
  tickets?: { title: string } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
  performed_by: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user_id: string;
}

interface RFIDetailSheetProps {
  rfi: RFI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function RFIDetailSheet({ rfi, open, onOpenChange, onUpdate }: RFIDetailSheetProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (rfi && open) {
      fetchActivities();
      fetchAttachments();
      fetchComments();
      setResponse(rfi.response || '');
    }
  }, [rfi, open]);

  const fetchActivities = async () => {
    if (!rfi) return;
    const { data } = await supabase
      .from('rfi_activity_log')
      .select('*')
      .eq('rfi_id', rfi.id)
      .order('created_at', { ascending: false });
    setActivities(data || []);
  };

  const fetchAttachments = async () => {
    if (!rfi) return;
    const { data } = await supabase
      .from('rfi_attachments')
      .select('*')
      .eq('rfi_id', rfi.id)
      .order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  const fetchComments = async () => {
    if (!rfi) return;
    const { data } = await supabase
      .from('rfi_comments')
      .select('*')
      .eq('rfi_id', rfi.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const updateStatus = async (newStatus: string) => {
    if (!rfi || !user) return;
    setLoading(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'submitted') updates.submitted_at = new Date().toISOString();
      if (newStatus === 'under_review') updates.under_review_at = new Date().toISOString();
      if (newStatus === 'answered') updates.answered_at = new Date().toISOString();
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString();

      const { error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', rfi.id);

      if (error) throw error;

      await supabase.from('rfi_activity_log').insert({
        rfi_id: rfi.id,
        action: `status_changed`,
        description: `Status changed to ${newStatus}`,
        performed_by: user.id,
      });

      toast.success('Status updated');
      onUpdate();
      fetchActivities();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!rfi || !user || !response.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rfis')
        .update({
          response: response.trim(),
          response_by: user.id,
          response_at: new Date().toISOString(),
          status: 'answered',
          answered_at: new Date().toISOString(),
        })
        .eq('id', rfi.id);

      if (error) throw error;

      await supabase.from('rfi_activity_log').insert({
        rfi_id: rfi.id,
        action: 'responded',
        description: 'Response submitted',
        performed_by: user.id,
      });

      toast.success('Response submitted');
      onUpdate();
      fetchActivities();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!rfi || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rfis')
        .update({
          approval_status: approved ? 'approved' : 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: approved ? 'closed' : 'under_review',
          closed_at: approved ? new Date().toISOString() : null,
        })
        .eq('id', rfi.id);

      if (error) throw error;

      await supabase.from('rfi_activity_log').insert({
        rfi_id: rfi.id,
        action: approved ? 'approved' : 'rejected',
        description: approved ? 'Response approved and RFI closed' : 'Response rejected, returned to review',
        performed_by: user.id,
      });

      toast.success(approved ? 'RFI approved and closed' : 'Response rejected');
      onUpdate();
      fetchActivities();
    } catch (error) {
      console.error('Error handling approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !rfi || !user) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${rfi.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rfi-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the file path, not the public URL (bucket is private)
      const { error: dbError } = await supabase.from('rfi_attachments').insert({
        rfi_id: rfi.id,
        file_name: file.name,
        file_url: filePath, // Store path for signed URL generation
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast.success('File uploaded');
      fetchAttachments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const addComment = async () => {
    if (!rfi || !user || !newComment.trim()) return;
    try {
      const { error } = await supabase.from('rfi_comments').insert({
        rfi_id: rfi.id,
        user_id: user.id,
        content: newComment.trim(),
        is_internal: false,
      });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileQuestion className="h-4 w-4" />;
      case 'submitted': return <Send className="h-4 w-4" />;
      case 'under_review': return <MessageSquare className="h-4 w-4" />;
      case 'answered': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!rfi) return null;

  const isOverdue = rfi.due_date && new Date(rfi.due_date) < new Date() && rfi.status !== 'closed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">{rfi.rfi_number}</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Header Info */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{rfi.title}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant={rfi.status === 'closed' ? 'secondary' : 'default'} className="gap-1">
                  {getStatusIcon(rfi.status)}
                  {rfi.status.replace('_', ' ')}
                </Badge>
                {rfi.priority && (
                  <Badge variant={rfi.priority === 'urgent' || rfi.priority === 'high' ? 'destructive' : 'secondary'}>
                    {rfi.priority}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
                {rfi.approval_status === 'approved' && (
                  <Badge variant="default" className="bg-green-600">Approved</Badge>
                )}
              </div>
            </div>

            {/* Status Actions */}
            {rfi.status !== 'closed' && (
              <div className="flex flex-wrap gap-2">
                {rfi.status === 'draft' && (
                  <Button size="sm" onClick={() => updateStatus('submitted')} disabled={loading}>
                    <Send className="h-4 w-4 mr-1" /> Submit
                  </Button>
                )}
                {rfi.status === 'submitted' && (
                  <Button size="sm" onClick={() => updateStatus('under_review')} disabled={loading}>
                    <MessageSquare className="h-4 w-4 mr-1" /> Start Review
                  </Button>
                )}
                {rfi.status === 'answered' && rfi.approval_status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleApproval(true)} disabled={loading}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve & Close
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleApproval(false)} disabled={loading}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
              </div>
            )}

            <Separator />

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="response" className="flex-1">Response</TabsTrigger>
                <TabsTrigger value="attachments" className="flex-1">Files ({attachments.length})</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {rfi.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap">{rfi.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {rfi.projects?.name && (
                    <div>
                      <Label className="text-muted-foreground">Project</Label>
                      <p className="mt-1">{rfi.projects.name}</p>
                    </div>
                  )}
                  {rfi.tickets?.title && (
                    <div>
                      <Label className="text-muted-foreground">Ticket</Label>
                      <p className="mt-1">{rfi.tickets.title}</p>
                    </div>
                  )}
                  {rfi.drawing_reference && (
                    <div>
                      <Label className="text-muted-foreground">Drawing Reference</Label>
                      <p className="mt-1">{rfi.drawing_reference}</p>
                    </div>
                  )}
                  {rfi.spec_reference && (
                    <div>
                      <Label className="text-muted-foreground">Spec Reference</Label>
                      <p className="mt-1">{rfi.spec_reference}</p>
                    </div>
                  )}
                  {rfi.due_date && (
                    <div>
                      <Label className="text-muted-foreground">Due Date</Label>
                      <p className="mt-1 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(rfi.due_date), 'PPP')}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="mt-1">{format(new Date(rfi.created_at), 'PPP')}</p>
                  </div>
                </div>

                {/* Comments Section */}
                <Separator />
                <div className="space-y-3">
                  <Label>Discussion</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-muted p-3 rounded-lg text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                        <p>{comment.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="response" className="space-y-4 mt-4">
                {rfi.response ? (
                  <div>
                    <Label className="text-muted-foreground">Response</Label>
                    <p className="mt-2 p-3 bg-muted rounded-lg whitespace-pre-wrap">{rfi.response}</p>
                    {rfi.response_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Responded on {format(new Date(rfi.response_at), 'PPP')}
                      </p>
                    )}
                  </div>
                ) : (
                  rfi.status === 'under_review' && (
                    <div className="space-y-3">
                      <Label htmlFor="response">Your Response</Label>
                      <Textarea
                        id="response"
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Enter your response to this RFI..."
                        rows={6}
                      />
                      <Button onClick={submitResponse} disabled={loading || !response.trim()}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Submit Response
                      </Button>
                    </div>
                  )
                )}
                {rfi.status !== 'under_review' && !rfi.response && (
                  <p className="text-muted-foreground">No response yet. Start review to add a response.</p>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <label className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  </Button>
                </div>

                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''} • {format(new Date(att.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <SignedFileLink
                        bucket="rfi-attachments"
                        path={att.file_url}
                        fileName={att.file_name}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                      </SignedFileLink>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No attachments</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">{activity.action.replace('_', ' ')}</p>
                        {activity.description && (
                          <p className="text-muted-foreground">{activity.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
