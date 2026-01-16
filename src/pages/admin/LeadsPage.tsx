import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Calendar,
  TrendingUp,
  UserPlus,
  Filter,
  MoreVertical,
  ArrowRight,
  Building2,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'New', color: 'bg-blue-500/10 text-blue-500', icon: UserPlus },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-500', icon: Phone },
  qualified: { label: 'Qualified', color: 'bg-purple-500/10 text-purple-500', icon: CheckCircle },
  proposal: { label: 'Proposal', color: 'bg-orange-500/10 text-orange-500', icon: Building2 },
  won: { label: 'Won', color: 'bg-green-500/10 text-green-500', icon: TrendingUp },
  lost: { label: 'Lost', color: 'bg-red-500/10 text-red-500', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
};

const sourceOptions = [
  'Website',
  'Referral',
  'Advertisement',
  'Cold Call',
  'Trade Show',
  'Social Media',
  'Other'
];

const LeadsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    source: '',
    priority: 'medium',
    estimated_value: '',
    notes: '',
    next_follow_up: '',
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('leads').insert({
        ...data,
        company_id: effectiveCompanyId,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create lead'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const convertToClientMutation = useMutation({
    mutationFn: async (lead: any) => {
      // Create client from lead
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          company_id: effectiveCompanyId,
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
        })
        .select()
        .single();
      
      if (clientError) throw clientError;

      // Update lead as converted
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'won',
          converted_to_client_id: client.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      
      if (leadError) throw leadError;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Lead converted to client!');
      setSelectedLead(null);
    },
    onError: () => toast.error('Failed to convert lead'),
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      source: '',
      priority: 'medium',
      estimated_value: '',
      notes: '',
      next_follow_up: '',
    });
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const pipelineStages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

  const getLeadsByStatus = (status: string) => 
    filteredLeads.filter(lead => lead.status === status);

  const getTotalValue = (status?: string) => {
    const leadsToSum = status ? getLeadsByStatus(status) : filteredLeads;
    return leadsToSum.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  };

  const stats = [
    { 
      title: 'Total Leads', 
      value: filteredLeads.length, 
      icon: Users,
      color: 'text-blue-500'
    },
    { 
      title: 'Pipeline Value', 
      value: `$${getTotalValue().toLocaleString()}`, 
      icon: DollarSign,
      color: 'text-green-500'
    },
    { 
      title: 'Won This Month', 
      value: getLeadsByStatus('won').length, 
      icon: TrendingUp,
      color: 'text-emerald-500'
    },
    { 
      title: 'Pending Follow-up', 
      value: filteredLeads.filter(l => l.next_follow_up && new Date(l.next_follow_up) <= new Date()).length, 
      icon: Clock,
      color: 'text-orange-500'
    },
  ];

  return (
    <FeatureGate featureKey="leads_management" showUpgradePrompt featureName="Leads & CRM">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads & CRM</h1>
            <p className="text-muted-foreground">Manage your sales pipeline and track opportunities</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Stats */}
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

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pipeline View */}
        {viewMode === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
            {pipelineStages.map((stage) => {
              const stageLeads = getLeadsByStatus(stage);
              const config = statusConfig[stage];
              return (
                <div key={stage} className="min-w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <span className="text-sm text-muted-foreground">({stageLeads.length})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ${getTotalValue(stage).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {stageLeads.map((lead) => (
                      <Card 
                        key={lead.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm truncate">{lead.full_name}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {pipelineStages.filter(s => s !== stage).map((s) => (
                                  <DropdownMenuItem 
                                    key={s}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatusMutation.mutate({ id: lead.id, status: s });
                                    }}
                                  >
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Move to {statusConfig[s].label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {lead.estimated_value && (
                            <p className="text-sm font-semibold text-green-600 mb-1">
                              ${lead.estimated_value.toLocaleString()}
                            </p>
                          )}
                          {lead.email && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </p>
                          )}
                          {lead.source && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {lead.source}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Contact</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Value</th>
                      <th className="p-4 font-medium">Source</th>
                      <th className="p-4 font-medium">Created</th>
                      <th className="p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{lead.full_name}</p>
                            {lead.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {lead.city}, {lead.state}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{lead.email}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={statusConfig[lead.status]?.color}>
                            {statusConfig[lead.status]?.label}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium">
                          {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-sm">{lead.source || '-'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm">View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No leads found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Lead Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(v) => setFormData({ ...formData, source: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Next Follow-up</Label>
                  <Input
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lead Detail Sheet */}
        <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedLead && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedLead.full_name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="flex gap-2">
                    <Badge className={statusConfig[selectedLead.status]?.color}>
                      {statusConfig[selectedLead.status]?.label}
                    </Badge>
                    <Badge className={priorityConfig[selectedLead.priority]?.color}>
                      {priorityConfig[selectedLead.priority]?.label} Priority
                    </Badge>
                  </div>

                  {selectedLead.estimated_value && (
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Estimated Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${selectedLead.estimated_value.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium">Contact Information</h4>
                    {selectedLead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedLead.email}`} className="hover:underline">
                          {selectedLead.email}
                        </a>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedLead.phone}`} className="hover:underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    )}
                    {selectedLead.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedLead.address}, {selectedLead.city} {selectedLead.state}</span>
                      </div>
                    )}
                  </div>

                  {selectedLead.notes && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLead.notes}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {pipelineStages.map((stage) => (
                        <Button
                          key={stage}
                          variant={selectedLead.status === stage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: selectedLead.id, status: stage })}
                        >
                          {statusConfig[stage].label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedLead.status !== 'won' && selectedLead.status !== 'lost' && (
                    <Button 
                      className="w-full" 
                      onClick={() => convertToClientMutation.mutate(selectedLead)}
                      disabled={convertToClientMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convert to Client
                    </Button>
                  )}

                  {selectedLead.converted_to_client_id && (
                    <div className="p-4 bg-green-500/10 rounded-lg text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-600">
                        Converted to Client on {format(new Date(selectedLead.converted_at), 'MMM d, yyyy')}
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

export default LeadsPage;
