import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CreateSubmittalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
}

export function CreateSubmittalDialog({ open, onOpenChange, companyId }: CreateSubmittalDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [specSection, setSpecSection] = useState('');
  const [drawingReference, setDrawingReference] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date>();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const generateSubmittalNumber = async () => {
    const { count } = await supabase
      .from('submittals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const num = (count || 0) + 1;
    return `SUB-${String(num).padStart(4, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!companyId || !title.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const submittalNumber = await generateSubmittalNumber();

      const { data: submittal, error: submittalError } = await supabase
        .from('submittals')
        .insert({
          company_id: companyId,
          project_id: projectId || null,
          submittal_number: submittalNumber,
          title: title.trim(),
          description: description.trim() || null,
          spec_section: specSection.trim() || null,
          drawing_reference: drawingReference.trim() || null,
          priority,
          due_date: dueDate?.toISOString().split('T')[0] || null,
          submitted_by: user?.id,
        })
        .select()
        .single();

      if (submittalError) throw submittalError;

      // Upload attachments
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${companyId}/${submittal.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('submittal-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

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

      // Log activity
      await supabase.from('submittal_activity_log').insert({
        submittal_id: submittal.id,
        action: 'created',
        description: 'Submittal created',
        performed_by: user?.id,
      });

      toast.success('Submittal created successfully');
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating submittal:', error);
      toast.error(error.message || 'Failed to create submittal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSpecSection('');
    setDrawingReference('');
    setProjectId('');
    setPriority('medium');
    setDueDate(undefined);
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Submittal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Submittal title"
              />
            </div>

            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="specSection">Spec Section</Label>
              <Input
                id="specSection"
                value={specSection}
                onChange={(e) => setSpecSection(e.target.value)}
                placeholder="e.g., 03 30 00"
              />
            </div>

            <div>
              <Label htmlFor="drawingReference">Drawing Reference</Label>
              <Input
                id="drawingReference"
                value={drawingReference}
                onChange={(e) => setDrawingReference(e.target.value)}
                placeholder="e.g., A-101"
              />
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Submittal description..."
              rows={3}
            />
          </div>

          <div>
            <Label>Attachments</Label>
            <div className="mt-2 border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload files
                </span>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Submittal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
