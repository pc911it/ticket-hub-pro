import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Flag, CheckCircle2, Circle, Trash2, Edit2 } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  status: string;
  completed_at: string | null;
}

interface ProjectMilestonesProps {
  projectId: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
}

export const ProjectMilestones = ({ projectId, projectStartDate, projectEndDate }: ProjectMilestonesProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    if (data) setMilestones(data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', due_date: '' });
    setEditingMilestone(null);
  };

  const handleOpenDialog = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        due_date: milestone.due_date,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      project_id: projectId,
      name: formData.name,
      description: formData.description || null,
      due_date: formData.due_date,
    };

    if (editingMilestone) {
      const { error } = await supabase
        .from('project_milestones')
        .update(payload)
        .eq('id', editingMilestone.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update milestone.' });
      } else {
        toast({ title: 'Success', description: 'Milestone updated.' });
        fetchMilestones();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('project_milestones').insert(payload);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create milestone.' });
      } else {
        toast({ title: 'Success', description: 'Milestone created.' });
        fetchMilestones();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleToggleStatus = async (milestone: Milestone) => {
    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('project_milestones')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', milestone.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update milestone.' });
    } else {
      fetchMilestones();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;

    const { error } = await supabase.from('project_milestones').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete milestone.' });
    } else {
      toast({ title: 'Success', description: 'Milestone deleted.' });
      fetchMilestones();
    }
  };

  const getMilestonePosition = (dueDate: string) => {
    if (!projectStartDate || !projectEndDate) return null;
    
    const start = new Date(projectStartDate);
    const end = new Date(projectEndDate);
    const due = new Date(dueDate);
    
    const totalDays = differenceInDays(end, start);
    const daysFromStart = differenceInDays(due, start);
    
    if (totalDays <= 0) return 50;
    const position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    return position;
  };

  const getStatusInfo = (milestone: Milestone) => {
    if (milestone.status === 'completed') {
      return { color: 'bg-success text-success-foreground', icon: CheckCircle2, label: 'Completed' };
    }
    const dueDate = new Date(milestone.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { color: 'bg-destructive text-destructive-foreground', icon: Flag, label: 'Overdue' };
    }
    if (isToday(dueDate)) {
      return { color: 'bg-warning text-warning-foreground', icon: Flag, label: 'Due Today' };
    }
    return { color: 'bg-muted text-muted-foreground', icon: Circle, label: 'Pending' };
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Milestones</h3>
          {milestones.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{milestones.length}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Timeline visualization */}
      {projectStartDate && projectEndDate && milestones.length > 0 && (
        <div className="relative h-12 bg-muted/50 rounded-lg overflow-hidden">
          {/* Progress bar background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
          
          {/* Milestone markers */}
          {milestones.map((milestone) => {
            const position = getMilestonePosition(milestone.due_date);
            if (position === null) return null;
            
            const statusInfo = getStatusInfo(milestone);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={milestone.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${position}%` }}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110",
                    statusInfo.color
                  )}
                  title={`${milestone.name} - ${format(new Date(milestone.due_date), 'MMM d, yyyy')}`}
                >
                  <StatusIcon className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No milestones yet. Add milestones to track project progress.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const statusInfo = getStatusInfo(milestone);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={milestone.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  milestone.status === 'completed' ? 'bg-success/5' : 'bg-muted/50 hover:bg-muted'
                )}
              >
                <button
                  onClick={() => handleToggleStatus(milestone)}
                  className={cn(
                    "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                    statusInfo.color
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    milestone.status === 'completed' && 'line-through text-muted-foreground'
                  )}>
                    {milestone.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                    {milestone.description && ` • ${milestone.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenDialog(milestone)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(milestone.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-name">Name *</Label>
              <Input
                id="milestone-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Foundation Complete"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-date">Due Date *</Label>
              <Input
                id="milestone-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-desc">Description</Label>
              <Textarea
                id="milestone-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingMilestone ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
