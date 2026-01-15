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
import { Input } from '@/components/ui/input';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileCheck,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Paperclip,
  Loader2,
  Trash2,
  ExternalLink,
  ClipboardCheck,
  Plus,
  Building,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PermitDetailSheetProps {
  permit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const inspectionStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

export function PermitDetailSheet({ permit, open, onOpenChange }: PermitDetailSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Inspection form state
  const [inspectionType, setInspectionType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [isAddingInspection, setIsAddingInspection] = useState(false);

  const { data: documents, refetch: refetchDocuments } = useQuery({
    queryKey: ['permit-documents', permit?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_documents')
        .select('*')
        .eq('permit_id', permit.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!permit?.id,
  });

  const { data: inspections, refetch: refetchInspections } = useQuery({
    queryKey: ['permit-inspections', permit?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_inspections')
        .select('*')
        .eq('permit_id', permit.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!permit?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'approved') {
        updates.approval_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'issued') {
        updates.issue_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('permits')
        .update(updates)
        .eq('id', permit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      setSelectedStatus('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    if (!e.target.files?.length || !permit) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${permit.company_id}/${permit.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('permit-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('permit-documents')
          .getPublicUrl(filePath);

        await supabase.from('permit_documents').insert({
          permit_id: permit.id,
          document_type: documentType,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        });
      }

      toast.success('Document uploaded successfully');
      refetchDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const addInspectionMutation = useMutation({
    mutationFn: async () => {
      if (!inspectionType || !scheduledDate) {
        throw new Error('Please fill in all required fields');
      }

      const { error } = await supabase.from('permit_inspections').insert({
        permit_id: permit.id,
        inspection_type: inspectionType,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'scheduled',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Inspection scheduled');
      refetchInspections();
      setInspectionType('');
      setScheduledDate(undefined);
      setIsAddingInspection(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: async ({ inspectionId, status, result, notes }: any) => {
      const updates: any = {
        status,
        result,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (status === 'passed' || status === 'failed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('permit_inspections')
        .update(updates)
        .eq('id', inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Inspection updated');
      refetchInspections();
    },
  });

  const deletePermitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('permits')
        .delete()
        .eq('id', permit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Permit deleted');
      queryClient.invalidateQueries({ queryKey: ['permits'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete permit');
    },
  });

  if (!permit) return null;

  const isExpired = permit.expiration_date && isPast(new Date(permit.expiration_date));
  const daysUntilExpiry = permit.expiration_date 
    ? differenceInDays(new Date(permit.expiration_date), new Date())
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {permit.permit_number}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{permit.title}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={statusColors[permit.status] || ''}>
                {permit.status.replace(/_/g, ' ')}
              </Badge>
              {isExpired && (
                <Badge variant="destructive">Expired</Badge>
              )}
              {isExpiringSoon && (
                <Badge className="bg-orange-100 text-orange-800">
                  Expires in {daysUntilExpiry} days
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Permit Type</Label>
                    <p className="font-medium">{permit.permit_type}</p>
                  </div>
                  {permit.project && (
                    <div>
                      <Label className="text-muted-foreground">Project</Label>
                      <p className="font-medium flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {permit.project.name}
                      </p>
                    </div>
                  )}
                  {permit.issuing_authority && (
                    <div>
                      <Label className="text-muted-foreground">Issuing Authority</Label>
                      <p className="font-medium">{permit.issuing_authority}</p>
                    </div>
                  )}
                  {permit.application_date && (
                    <div>
                      <Label className="text-muted-foreground">Application Date</Label>
                      <p className="font-medium">{format(new Date(permit.application_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {permit.approval_date && (
                    <div>
                      <Label className="text-muted-foreground">Approval Date</Label>
                      <p className="font-medium">{format(new Date(permit.approval_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {permit.issue_date && (
                    <div>
                      <Label className="text-muted-foreground">Issue Date</Label>
                      <p className="font-medium">{format(new Date(permit.issue_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {permit.expiration_date && (
                    <div>
                      <Label className="text-muted-foreground">Expiration Date</Label>
                      <p className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-orange-500' : ''}`}>
                        {format(new Date(permit.expiration_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                  {permit.fee_amount && (
                    <div>
                      <Label className="text-muted-foreground">Fee Amount</Label>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${permit.fee_amount.toFixed(2)}
                        {permit.fee_paid && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" />
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {permit.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{permit.description}</p>
                  </div>
                )}

                {permit.conditions && (
                  <div>
                    <Label className="text-muted-foreground">Conditions</Label>
                    <p className="text-sm mt-1">{permit.conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

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

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permit
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Permit?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the permit and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePermitMutation.mutate()}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Documents</CardTitle>
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'general')}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload">
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
                {documents?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No documents yet</p>
                ) : (
                  <div className="space-y-2">
                    {documents?.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type} • {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
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

          <TabsContent value="inspections" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Inspections</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingInspection(!isAddingInspection)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {isAddingInspection && (
                  <div className="p-4 border rounded-lg mb-4 space-y-3">
                    <div>
                      <Label>Inspection Type *</Label>
                      <Input
                        value={inspectionType}
                        onChange={(e) => setInspectionType(e.target.value)}
                        placeholder="e.g., Foundation, Framing, Final"
                      />
                    </div>
                    <div>
                      <Label>Scheduled Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !scheduledDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addInspectionMutation.mutate()}
                        disabled={addInspectionMutation.isPending}
                        size="sm"
                      >
                        {addInspectionMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Add Inspection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingInspection(false);
                          setInspectionType('');
                          setScheduledDate(undefined);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {inspections?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No inspections scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {inspections?.map((inspection) => (
                      <div key={inspection.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{inspection.inspection_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {inspection.scheduled_date && format(new Date(inspection.scheduled_date), 'MMM d, yyyy')}
                              {inspection.inspector_name && ` • ${inspection.inspector_name}`}
                            </p>
                          </div>
                          <Badge className={inspectionStatusColors[inspection.status] || ''}>
                            {inspection.status}
                          </Badge>
                        </div>

                        {inspection.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => updateInspectionMutation.mutate({
                                inspectionId: inspection.id,
                                status: 'passed',
                                result: 'Passed',
                              })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Pass
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => updateInspectionMutation.mutate({
                                inspectionId: inspection.id,
                                status: 'failed',
                                result: 'Failed',
                              })}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Fail
                            </Button>
                          </div>
                        )}

                        {inspection.result && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Result:</span> {inspection.result}
                          </p>
                        )}
                        {inspection.notes && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Notes:</span> {inspection.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
