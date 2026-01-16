import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  FileText, 
  DollarSign, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Trash2
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-500/10 text-yellow-500' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-500' },
};

const reasonOptions = [
  { value: 'client_request', label: 'Client Request' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'unforeseen_conditions', label: 'Unforeseen Conditions' },
  { value: 'code_compliance', label: 'Code Compliance' },
  { value: 'value_engineering', label: 'Value Engineering' },
  { value: 'other', label: 'Other' },
];

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

const ChangeOrdersPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCO, setSelectedCO] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    client_id: '',
    reason: '',
    schedule_impact_days: 0,
    requested_by: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 }
  ]);

  const { data: changeOrders, isLoading } = useQuery({
    queryKey: ['change-orders', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-co', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name, client_id, clients(full_name)')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const generateCONumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('change_orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId);
    return `CO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const coNumber = await generateCONumber();
      const costImpact = lineItems.reduce((sum, item) => sum + item.total, 0);
      
      const { data: co, error } = await supabase
        .from('change_orders')
        .insert({
          company_id: effectiveCompanyId,
          change_order_number: coNumber,
          title: data.title,
          description: data.description,
          project_id: data.project_id || null,
          client_id: data.client_id || null,
          reason: data.reason,
          cost_impact: costImpact,
          original_amount: costImpact,
          revised_amount: costImpact,
          schedule_impact_days: data.schedule_impact_days,
          requested_by: data.requested_by,
          requested_date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Insert line items
      if (lineItems.length > 0 && lineItems[0].description) {
        const { error: itemsError } = await supabase
          .from('change_order_items')
          .insert(
            lineItems
              .filter(item => item.description)
              .map((item, idx) => ({
                change_order_id: co.id,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                total: item.total,
                sort_order: idx,
              }))
          );
        if (itemsError) throw itemsError;
      }

      return co;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Change order created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create change order'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (status === 'rejected') {
        updates.rejection_reason = notes;
      }
      
      const { error } = await supabase
        .from('change_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Status updated');
      setSelectedCO(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      client_id: '',
      reason: '',
      schedule_impact_days: 0,
      requested_by: '',
    });
    setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 }]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 1, unit: '', unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(items => items.filter(item => item.id !== id));
    }
  };

  const filteredOrders = changeOrders?.filter(co => {
    const matchesSearch = co.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.change_order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totalCostImpact = lineItems.reduce((sum, item) => sum + item.total, 0);

  const stats = [
    { title: 'Total COs', value: changeOrders?.length || 0, icon: FileText, color: 'text-blue-500' },
    { title: 'Pending', value: changeOrders?.filter(c => c.status === 'pending_approval').length || 0, icon: Clock, color: 'text-yellow-500' },
    { title: 'Approved', value: changeOrders?.filter(c => c.status === 'approved').length || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Total Impact', value: `$${(changeOrders?.reduce((sum, c) => sum + (c.cost_impact || 0), 0) || 0).toLocaleString()}`, icon: DollarSign, color: 'text-orange-500' },
  ];

  return (
    <FeatureGate featureKey="change_orders" showUpgradePrompt featureName="Change Orders">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Change Orders</h1>
            <p className="text-muted-foreground">Manage project change requests and approvals</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Change Order
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
              placeholder="Search change orders..."
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

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">CO #</th>
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Project</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Cost Impact</th>
                    <th className="p-4 font-medium">Days Impact</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((co) => (
                    <tr 
                      key={co.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedCO(co)}
                    >
                      <td className="p-4 font-mono text-sm">{co.change_order_number}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{co.title}</p>
                          <p className="text-xs text-muted-foreground">{reasonOptions.find(r => r.value === co.reason)?.label}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{co.projects?.name || '-'}</td>
                      <td className="p-4">
                        <Badge className={statusConfig[co.status]?.color}>
                          {statusConfig[co.status]?.label}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">
                        <span className={co.cost_impact > 0 ? 'text-red-500' : co.cost_impact < 0 ? 'text-green-500' : ''}>
                          {co.cost_impact > 0 ? '+' : ''}${(co.cost_impact || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        {co.schedule_impact_days ? `${co.schedule_impact_days > 0 ? '+' : ''}${co.schedule_impact_days} days` : '-'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(co.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No change orders found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Change Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Change order title"
                  />
                </div>
                <div>
                  <Label>Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(v) => {
                      const project = projects?.find(p => p.id === v);
                      setFormData({ 
                        ...formData, 
                        project_id: v,
                        client_id: project?.client_id || ''
                      });
                    }}
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
                  <Label>Reason</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(v) => setFormData({ ...formData, reason: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Requested By</Label>
                  <Input
                    value={formData.requested_by}
                    onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                    placeholder="Name of requester"
                  />
                </div>
                <div>
                  <Label>Schedule Impact (Days)</Label>
                  <Input
                    type="number"
                    value={formData.schedule_impact_days}
                    onChange={(e) => setFormData({ ...formData, schedule_impact_days: parseInt(e.target.value) || 0 })}
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
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-xs">Description</Label>}
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Qty</Label>}
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Total</Label>}
                      <Input value={`$${item.total.toFixed(2)}`} disabled />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Cost Impact</p>
                    <p className="text-2xl font-bold">${totalCostImpact.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Change Order'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedCO} onOpenChange={() => setSelectedCO(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedCO && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedCO.change_order_number}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <Badge className={statusConfig[selectedCO.status]?.color}>
                    {statusConfig[selectedCO.status]?.label}
                  </Badge>

                  <div>
                    <h3 className="font-medium text-lg">{selectedCO.title}</h3>
                    {selectedCO.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedCO.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Cost Impact</p>
                      <p className={`text-xl font-bold ${selectedCO.cost_impact > 0 ? 'text-red-500' : selectedCO.cost_impact < 0 ? 'text-green-500' : ''}`}>
                        {selectedCO.cost_impact > 0 ? '+' : ''}${(selectedCO.cost_impact || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Schedule Impact</p>
                      <p className="text-xl font-bold">
                        {selectedCO.schedule_impact_days ? `${selectedCO.schedule_impact_days > 0 ? '+' : ''}${selectedCO.schedule_impact_days} days` : 'None'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Project</span>
                      <span>{selectedCO.projects?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reason</span>
                      <span>{reasonOptions.find(r => r.value === selectedCO.reason)?.label || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Requested By</span>
                      <span>{selectedCO.requested_by || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Requested Date</span>
                      <span>{selectedCO.requested_date ? format(new Date(selectedCO.requested_date), 'MMM d, yyyy') : '-'}</span>
                    </div>
                  </div>

                  {selectedCO.status === 'draft' && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: selectedCO.id, status: 'pending_approval' })}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Approval
                      </Button>
                    </div>
                  )}

                  {selectedCO.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: selectedCO.id, status: 'rejected' })}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: selectedCO.id, status: 'approved' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  )}

                  {selectedCO.approved_at && (
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Approved</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        on {format(new Date(selectedCO.approved_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}

                  {selectedCO.rejection_reason && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Rejected</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedCO.rejection_reason}
                      </p>
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

export default ChangeOrdersPage;
