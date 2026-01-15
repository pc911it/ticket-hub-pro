import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateRFIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRFIDialog({ open, onOpenChange, onSuccess }: CreateRFIDialogProps) {
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tickets, setTickets] = useState<{ id: string; title: string }[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    ticketId: '',
    priority: 'medium',
    dueDate: null as Date | null,
    drawingReference: '',
    specReference: '',
  });

  useEffect(() => {
    if (open && effectiveCompanyId) {
      fetchProjects();
      fetchTickets();
    }
  }, [open, effectiveCompanyId]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', effectiveCompanyId)
      .is('deleted_at', null)
      .order('name');
    setProjects(data || []);
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('id, title')
      .eq('company_id', effectiveCompanyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    setTickets(data || []);
  };

  const generateRFINumber = async (): Promise<string> => {
    const { count } = await supabase
      .from('rfis')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId!);
    
    const nextNumber = (count || 0) + 1;
    return `RFI-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent, submitAfter = false) => {
    e.preventDefault();
    if (!effectiveCompanyId || !user) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);
    try {
      const rfiNumber = await generateRFINumber();

      const { data: rfi, error } = await supabase
        .from('rfis')
        .insert({
          rfi_number: rfiNumber,
          company_id: effectiveCompanyId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          project_id: formData.projectId || null,
          ticket_id: formData.ticketId || null,
          priority: formData.priority,
          due_date: formData.dueDate?.toISOString() || null,
          drawing_reference: formData.drawingReference.trim() || null,
          spec_reference: formData.specReference.trim() || null,
          status: submitAfter ? 'submitted' : 'draft',
          submitted_by: user.id,
          submitted_at: submitAfter ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('rfi_activity_log').insert({
        rfi_id: rfi.id,
        action: submitAfter ? 'submitted' : 'created',
        description: submitAfter ? 'RFI submitted for review' : 'RFI created as draft',
        performed_by: user.id,
      });

      toast.success(submitAfter ? 'RFI submitted successfully' : 'RFI created as draft');
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating RFI:', error);
      toast.error('Failed to create RFI');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      projectId: '',
      ticketId: '',
      priority: 'medium',
      dueDate: null,
      drawingReference: '',
      specReference: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New RFI</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the request"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed explanation of what information is needed..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ticket (Optional)</Label>
              <Select value={formData.ticketId} onValueChange={(v) => setFormData({ ...formData, ticketId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tickets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
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

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate || undefined}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drawing">Drawing Reference</Label>
              <Input
                id="drawing"
                value={formData.drawingReference}
                onChange={(e) => setFormData({ ...formData, drawingReference: e.target.value })}
                placeholder="e.g., Sheet A-101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spec">Specification Reference</Label>
              <Input
                id="spec"
                value={formData.specReference}
                onChange={(e) => setFormData({ ...formData, specReference: e.target.value })}
                placeholder="e.g., Section 03 30 00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            <Button type="button" onClick={(e) => handleSubmit(e, true)} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit RFI
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
