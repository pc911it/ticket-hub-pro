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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  PlayCircle
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Wrench },
  assigned: { label: 'Assigned', color: 'bg-blue-500/10 text-blue-500', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-500', icon: PlayCircle },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
};

const workTypeOptions = [
  { value: 'repair', label: 'Repair' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

const WorkOrdersPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    work_type: '',
    priority: 'medium',
    scheduled_start: '',
    scheduled_end: '',
    estimated_hours: '',
    estimated_cost: '',
    location_details: '',
    special_instructions: '',
  });

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-wo', effectiveCompanyId],
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

  const generateWONumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId);
    return `WO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const woNumber = await generateWONumber();
      const { error } = await supabase.from('work_orders').insert({
        company_id: effectiveCompanyId,
        work_order_number: woNumber,
        title: data.title,
        description: data.description,
        project_id: data.project_id || null,
        work_type: data.work_type,
        priority: data.priority,
        scheduled_start: data.scheduled_start || null,
        scheduled_end: data.scheduled_end || null,
        estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        location_details: data.location_details,
        special_instructions: data.special_instructions,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create work order'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'in_progress') {
        updates.actual_start = new Date().toISOString();
      }
      if (status === 'completed') {
        updates.actual_end = new Date().toISOString();
        updates.completed_by = user?.id;
      }
      
      const { error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      work_type: '',
      priority: 'medium',
      scheduled_start: '',
      scheduled_end: '',
      estimated_hours: '',
      estimated_cost: '',
      location_details: '',
      special_instructions: '',
    });
  };

  const filteredOrders = workOrders?.filter(wo => {
    const matchesSearch = wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.work_order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = [
    { title: 'Total', value: workOrders?.length || 0, icon: Wrench, color: 'text-blue-500' },
    { title: 'In Progress', value: workOrders?.filter(w => w.status === 'in_progress').length || 0, icon: PlayCircle, color: 'text-yellow-500' },
    { title: 'Completed', value: workOrders?.filter(w => w.status === 'completed').length || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Est. Cost', value: `$${(workOrders?.reduce((sum, w) => sum + (w.estimated_cost || 0), 0) || 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
  ];

  return (
    <FeatureGate featureKey="work_orders" showUpgradePrompt featureName="Work Orders">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
            <p className="text-muted-foreground">Create and track work orders for your projects</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
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
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((wo) => {
            const StatusIcon = statusConfig[wo.status]?.icon || Wrench;
            return (
              <Card 
                key={wo.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedWO(wo)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{wo.work_order_number}</p>
                      <h3 className="font-medium mt-1">{wo.title}</h3>
                    </div>
                    <Badge className={statusConfig[wo.status]?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[wo.status]?.label}
                    </Badge>
                  </div>
                  
                  {wo.projects?.name && (
                    <p className="text-sm text-muted-foreground mb-2">{wo.projects.name}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={priorityConfig[wo.priority]?.color}>
                      {priorityConfig[wo.priority]?.label}
                    </Badge>
                    {wo.work_type && (
                      <Badge variant="outline">
                        {workTypeOptions.find(t => t.value === wo.work_type)?.label}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {wo.scheduled_start && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(wo.scheduled_start), 'MMM d')}
                      </span>
                    )}
                    {wo.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {wo.estimated_hours}h
                      </span>
                    )}
                    {wo.estimated_cost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${wo.estimated_cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No work orders found
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Work order title"
                  />
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
                  <Label>Work Type</Label>
                  <Select
                    value={formData.work_type}
                    onValueChange={(v) => setFormData({ ...formData, work_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Scheduled Start</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Scheduled End</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_end}
                    onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estimated Cost ($)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location Details</Label>
                  <Input
                    value={formData.location_details}
                    onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                    placeholder="Building, room, etc."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Special Instructions</Label>
                  <Textarea
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedWO} onOpenChange={() => setSelectedWO(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedWO && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedWO.work_order_number}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="flex gap-2">
                    <Badge className={statusConfig[selectedWO.status]?.color}>
                      {statusConfig[selectedWO.status]?.label}
                    </Badge>
                    <Badge className={priorityConfig[selectedWO.priority]?.color}>
                      {priorityConfig[selectedWO.priority]?.label}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-medium text-lg">{selectedWO.title}</h3>
                    {selectedWO.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedWO.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedWO.estimated_hours && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Est. Hours</p>
                        <p className="font-medium">{selectedWO.estimated_hours}h</p>
                      </div>
                    )}
                    {selectedWO.estimated_cost && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Est. Cost</p>
                        <p className="font-medium">${selectedWO.estimated_cost.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {selectedWO.status !== 'completed' && selectedWO.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {selectedWO.status === 'draft' && (
                        <Button 
                          className="flex-1"
                          onClick={() => updateStatusMutation.mutate({ id: selectedWO.id, status: 'assigned' })}
                        >
                          Assign
                        </Button>
                      )}
                      {selectedWO.status === 'assigned' && (
                        <Button 
                          className="flex-1"
                          onClick={() => updateStatusMutation.mutate({ id: selectedWO.id, status: 'in_progress' })}
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Work
                        </Button>
                      )}
                      {selectedWO.status === 'in_progress' && (
                        <Button 
                          className="flex-1"
                          onClick={() => updateStatusMutation.mutate({ id: selectedWO.id, status: 'completed' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  );
};

export default WorkOrdersPage;
