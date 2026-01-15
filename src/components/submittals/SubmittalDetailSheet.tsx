import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  History,
  Paperclip,
  Loader2,
  Send,
  RefreshCw,
  Trash2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SubmittalDetailSheetProps {
  submittal: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  approved_as_noted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  resubmit: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export function SubmittalDetailSheet({ submittal, open, onOpenChange }: SubmittalDetailSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewComments, setReviewComments] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: attachments, refetch: refetchAttachments } = useQuery({
    queryKey: ['submittal-attachments', submittal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submittal_attachments')
        .select('*')
        .eq('submittal_id', submittal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!submittal?.id,
  });

  const { data: revisions } = useQuery({
    queryKey: ['submittal-revisions', submittal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submittal_revisions')
        .select('*')
        .eq('submittal_id', submittal.id)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!submittal?.id,
  });

  const { data: activityLog } = useQuery({
    queryKey: ['submittal-activity', submittal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submittal_activity_log')
        .select('*')
        .eq('submittal_id', submittal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!submittal?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'approved' || newStatus === 'approved_as_noted') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
        updates.approval_status = 'approved';
      } else if (newStatus === 'rejected') {
        updates.rejection_reason = reviewComments;
        updates.approval_status = 'rejected';
      }

      const { error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', submittal.id);

      if (error) throw error;

      await supabase.from('submittal_activity_log').insert({
        submittal_id: submittal.id,
        action: `status_changed_to_${newStatus}`,
        description: reviewComments || `Status updated to ${newStatus.replace(/_/g, ' ')}`,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      queryClient.invalidateQueries({ queryKey: ['submittal-activity', submittal?.id] });
      setReviewComments('');
      setSelectedStatus('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('submittals')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq('id', submittal.id);

      if (error) throw error;

      await supabase.from('submittal_activity_log').insert({
        submittal_id: submittal.id,
        action: 'submitted',
        description: 'Submittal submitted for review',
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success('Submittal submitted for review');
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      queryClient.invalidateQueries({ queryKey: ['submittal-activity', submittal?.id] });
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: async () => {
      const newRevisionNumber = (submittal.revision_number || 1) + 1;

      await supabase.from('submittal_revisions').insert({
        submittal_id: submittal.id,
        revision_number: newRevisionNumber,
        changes_description: reviewComments || 'New revision created',
        submitted_by: user?.id,
      });

      const { error } = await supabase
        .from('submittals')
        .update({
          revision_number: newRevisionNumber,
          status: 'draft',
          approval_status: 'pending',
        })
        .eq('id', submittal.id);

      if (error) throw error;

      await supabase.from('submittal_activity_log').insert({
        submittal_id: submittal.id,
        action: 'revision_created',
        description: `Revision ${newRevisionNumber} created`,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success('New revision created');
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      queryClient.invalidateQueries({ queryKey: ['submittal-revisions', submittal?.id] });
      queryClient.invalidateQueries({ queryKey: ['submittal-activity', submittal?.id] });
      setReviewComments('');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !submittal) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${submittal.company_id}/${submittal.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('submittal-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('submittal-attachments')
          .getPublicUrl(filePath);

        await supabase.from('submittal_attachments').insert({
          submittal_id: submittal.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });
      }

      toast.success('Files uploaded successfully');
      refetchAttachments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSubmittalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('submittals')
        .delete()
        .eq('id', submittal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Submittal deleted');
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete submittal');
    },
  });

  if (!submittal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {submittal.submittal_number}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{submittal.title}</p>
            </div>
            <Badge className={statusColors[submittal.status] || ''}>
              {submittal.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attachments">Files</TabsTrigger>
            <TabsTrigger value="revisions">Revisions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {submittal.project && (
                    <div>
                      <Label className="text-muted-foreground">Project</Label>
                      <p className="font-medium">{submittal.project.name}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <p className="font-medium capitalize">{submittal.priority}</p>
                  </div>
                  {submittal.spec_section && (
                    <div>
                      <Label className="text-muted-foreground">Spec Section</Label>
                      <p className="font-medium">{submittal.spec_section}</p>
                    </div>
                  )}
                  {submittal.drawing_reference && (
                    <div>
                      <Label className="text-muted-foreground">Drawing Reference</Label>
                      <p className="font-medium">{submittal.drawing_reference}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Revision</Label>
                    <p className="font-medium">Rev {submittal.revision_number || 1}</p>
                  </div>
                  {submittal.due_date && (
                    <div>
                      <Label className="text-muted-foreground">Due Date</Label>
                      <p className="font-medium">{format(new Date(submittal.due_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>

                {submittal.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{submittal.description}</p>
                  </div>
                )}

                {submittal.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Label className="text-destructive">Rejection Reason</Label>
                    <p className="text-sm mt-1">{submittal.rejection_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submittal.status === 'draft' && (
                  <Button onClick={() => submitForReviewMutation.mutate()} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                )}

                {(submittal.status === 'submitted' || submittal.status === 'under_review') && (
                  <div className="space-y-3">
                    <div>
                      <Label>Update Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="approved_as_noted">Approve as Noted</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                          <SelectItem value="resubmit">Request Resubmit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Review Comments</Label>
                      <Textarea
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Add comments..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={() => updateStatusMutation.mutate(selectedStatus)}
                      disabled={!selectedStatus || updateStatusMutation.isPending}
                      className="w-full"
                    >
                      {updateStatusMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Update Status
                    </Button>
                  </div>
                )}

                {(submittal.status === 'rejected' || submittal.status === 'resubmit') && (
                  <div className="space-y-3">
                    <div>
                      <Label>Revision Notes</Label>
                      <Textarea
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Describe changes for new revision..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={() => createRevisionMutation.mutate()} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Create New Revision
                    </Button>
                  </div>
                )}

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Submittal
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Submittal?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the submittal and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSubmittalMutation.mutate()}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Attachments</CardTitle>
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="attachment-upload"
                  />
                  <label htmlFor="attachment-upload">
                    <Button asChild variant="outline" size="sm" disabled={isUploading}>
                      <span>
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload
                      </span>
                    </Button>
                  </label>
                </div>
              </CardHeader>
              <CardContent>
                {attachments?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attachments yet</p>
                ) : (
                  <div className="space-y-2">
                    {attachments?.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ''}
                              {' • '}
                              {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revisions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revision History</CardTitle>
              </CardHeader>
              <CardContent>
                {revisions?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No revisions yet</p>
                ) : (
                  <div className="space-y-4">
                    {revisions?.map((revision) => (
                      <div key={revision.id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Revision {revision.revision_number}</span>
                          <Badge variant="outline" className="capitalize">
                            {revision.status}
                          </Badge>
                        </div>
                        {revision.changes_description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {revision.changes_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(revision.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {activityLog?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No activity yet</p>
                  ) : (
                    <div className="space-y-4">
                      {activityLog?.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {activity.action.replace(/_/g, ' ')}
                            </p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
