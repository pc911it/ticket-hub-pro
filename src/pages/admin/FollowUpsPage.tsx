import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { 
  Plus, 
  Search, 
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Building2,
  Shield
} from 'lucide-react';

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  follow_up: { label: 'Follow Up', color: 'bg-blue-500/10 text-blue-500', icon: Bell },
  warranty_check: { label: 'Warranty Check', color: 'bg-purple-500/10 text-purple-500', icon: Shield },
  satisfaction_survey: { label: 'Satisfaction Survey', color: 'bg-green-500/10 text-green-500', icon: User },
  anniversary: { label: 'Anniversary', color: 'bg-orange-500/10 text-orange-500', icon: Calendar },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'High', color: 'bg-red-500/10 text-red-500' },
};

const FollowUpsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'follow_up',
    due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    priority: 'medium',
    project_id: '',
    client_id: '',
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['follow-up-reminders', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('follow_up_reminders')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-reminders', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-for-reminders', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('follow_up_reminders').insert({
        company_id: effectiveCompanyId,
        title: data.title,
        description: data.description,
        reminder_type: data.reminder_type,
        due_date: data.due_date,
        priority: data.priority,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-reminders'] });
      toast.success('Reminder created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create reminder'),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-reminders'] });
      toast.success('Marked as complete');
    },
    onError: () => toast.error('Failed to update'),
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({
          status: 'snoozed',
          snoozed_until: format(addDays(new Date(), days), 'yyyy-MM-dd'),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-reminders'] });
      toast.success('Reminder snoozed');
    },
    onError: () => toast.error('Failed to snooze'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      reminder_type: 'follow_up',
      due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      priority: 'medium',
      project_id: '',
      client_id: '',
    });
  };

  const filteredReminders = reminders?.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getDueDateLabel = (date: string) => {
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return { label: 'Overdue', color: 'text-red-500' };
    if (isToday(d)) return { label: 'Today', color: 'text-orange-500' };
    if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-yellow-500' };
    return { label: format(d, 'MMM d'), color: 'text-muted-foreground' };
  };

  const stats = [
    { 
      title: 'Overdue', 
      value: reminders?.filter(r => r.status === 'pending' && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date))).length || 0, 
      icon: AlertTriangle, 
      color: 'text-red-500' 
    },
    { 
      title: 'Due Today', 
      value: reminders?.filter(r => r.status === 'pending' && isToday(new Date(r.due_date))).length || 0, 
      icon: Clock, 
      color: 'text-orange-500' 
    },
    { 
      title: 'Upcoming', 
      value: reminders?.filter(r => r.status === 'pending' && !isPast(new Date(r.due_date))).length || 0, 
      icon: Calendar, 
      color: 'text-blue-500' 
    },
    { 
      title: 'Completed', 
      value: reminders?.filter(r => r.status === 'completed').length || 0, 
      icon: CheckCircle, 
      color: 'text-green-500' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-Ups & Reminders</h1>
          <p className="text-muted-foreground">Track client follow-ups and warranty checks</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reminder
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredReminders.map((reminder) => {
          const typeConf = typeConfig[reminder.reminder_type] || typeConfig.follow_up;
          const TypeIcon = typeConf.icon;
          const dueInfo = getDueDateLabel(reminder.due_date);
          const isOverdue = reminder.status === 'pending' && isPast(new Date(reminder.due_date)) && !isToday(new Date(reminder.due_date));

          return (
            <Card 
              key={reminder.id} 
              className={`${isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={reminder.status === 'completed'}
                    onCheckedChange={(checked) => {
                      if (checked) completeMutation.mutate(reminder.id);
                    }}
                    disabled={reminder.status === 'completed'}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-medium ${reminder.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {reminder.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className={typeConf.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeConf.label}
                        </Badge>
                        <Badge className={priorityConfig[reminder.priority]?.color}>
                          {priorityConfig[reminder.priority]?.label}
                        </Badge>
                      </div>
                    </div>
                    
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 font-medium ${dueInfo.color}`}>
                        <Calendar className="h-3 w-3" />
                        {dueInfo.label}
                      </span>
                      {reminder.clients?.full_name && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {reminder.clients.full_name}
                        </span>
                      )}
                      {reminder.projects?.name && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {reminder.projects.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {reminder.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => snoozeMutation.mutate({ id: reminder.id, days: 1 })}
                      >
                        +1d
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => snoozeMutation.mutate({ id: reminder.id, days: 7 })}
                      >
                        +1w
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => completeMutation.mutate(reminder.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredReminders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reminders found
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Reminder</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., 6-month check-in call"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.reminder_type}
                    onValueChange={(v) => setFormData({ ...formData, reminder_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Reminder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpsPage;
