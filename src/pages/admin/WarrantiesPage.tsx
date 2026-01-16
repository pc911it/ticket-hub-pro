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
import { format, differenceInDays, isPast } from 'date-fns';
import { 
  Plus, 
  Search, 
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500' },
  expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500' },
  claimed: { label: 'Claimed', color: 'bg-yellow-500/10 text-yellow-500' },
  void: { label: 'Void', color: 'bg-muted text-muted-foreground' },
};

const warrantyTypeOptions = [
  { value: 'workmanship', label: 'Workmanship' },
  { value: 'materials', label: 'Materials' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'other', label: 'Other' },
];

const WarrantiesPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    client_id: '',
    warranty_type: '',
    coverage_details: '',
    start_date: '',
    end_date: '',
    provider: '',
    contact_info: '',
  });

  const { data: warranties, isLoading } = useQuery({
    queryKey: ['warranties', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('warranties')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-warranties', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-for-warranties', effectiveCompanyId],
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

  const generateWarrantyNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('warranties')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId);
    return `WRN-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const warrantyNumber = await generateWarrantyNumber();
      const { error } = await supabase.from('warranties').insert({
        company_id: effectiveCompanyId,
        warranty_number: warrantyNumber,
        title: data.title,
        description: data.description,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        warranty_type: data.warranty_type,
        coverage_details: data.coverage_details,
        start_date: data.start_date,
        end_date: data.end_date,
        provider: data.provider,
        contact_info: data.contact_info,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast.success('Warranty created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create warranty'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      client_id: '',
      warranty_type: '',
      coverage_details: '',
      start_date: '',
      end_date: '',
      provider: '',
      contact_info: '',
    });
  };

  const getWarrantyStatus = (warranty: any) => {
    if (warranty.status === 'void' || warranty.status === 'claimed') return warranty.status;
    if (isPast(new Date(warranty.end_date))) return 'expired';
    return 'active';
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  };

  const filteredWarranties = warranties?.filter(warranty => {
    const matchesSearch = warranty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warranty.warranty_number.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getWarrantyStatus(warranty);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const activeWarranties = warranties?.filter(w => getWarrantyStatus(w) === 'active') || [];
  const expiringSoon = activeWarranties.filter(w => getDaysRemaining(w.end_date) <= 30 && getDaysRemaining(w.end_date) > 0);

  const stats = [
    { title: 'Total', value: warranties?.length || 0, icon: Shield, color: 'text-blue-500' },
    { title: 'Active', value: activeWarranties.length, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Expiring Soon', value: expiringSoon.length, icon: AlertTriangle, color: 'text-yellow-500' },
    { title: 'Expired', value: warranties?.filter(w => getWarrantyStatus(w) === 'expired').length || 0, icon: Clock, color: 'text-red-500' },
  ];

  return (
    <FeatureGate featureKey="warranties" showUpgradePrompt featureName="Warranty Tracking">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Warranties</h1>
            <p className="text-muted-foreground">Track and manage project warranties</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Warranty
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
              placeholder="Search warranties..."
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
          {filteredWarranties.map((warranty) => {
            const status = getWarrantyStatus(warranty);
            const daysRemaining = getDaysRemaining(warranty.end_date);
            
            return (
              <Card 
                key={warranty.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedWarranty(warranty)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{warranty.warranty_number}</p>
                      <h3 className="font-medium mt-1">{warranty.title}</h3>
                    </div>
                    <Badge className={statusConfig[status]?.color}>
                      {statusConfig[status]?.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {warranty.projects?.name && (
                      <p className="text-muted-foreground">{warranty.projects.name}</p>
                    )}
                    <Badge variant="outline">
                      {warrantyTypeOptions.find(t => t.value === warranty.warranty_type)?.label}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires {format(new Date(warranty.end_date), 'MMM d, yyyy')}
                    </span>
                    {status === 'active' && (
                      <span className={`font-medium ${daysRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {daysRemaining} days left
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredWarranties.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No warranties found
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Warranty</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Warranty title"
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
                        client_id: project?.client_id || formData.client_id
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
                  <Label>Warranty Type *</Label>
                  <Select
                    value={formData.warranty_type}
                    onValueChange={(v) => setFormData({ ...formData, warranty_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {warrantyTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Input
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="Company or manufacturer"
                  />
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Contact Info</Label>
                  <Input
                    value={formData.contact_info}
                    onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                    placeholder="Phone, email, or address"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Coverage Details</Label>
                  <Textarea
                    value={formData.coverage_details}
                    onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
                    rows={3}
                    placeholder="What is covered under this warranty..."
                  />
                </div>
                <div className="col-span-2">
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
                <Button type="submit" disabled={createMutation.isPending || !formData.title || !formData.warranty_type || !formData.start_date || !formData.end_date}>
                  {createMutation.isPending ? 'Creating...' : 'Create Warranty'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedWarranty} onOpenChange={() => setSelectedWarranty(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedWarranty && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedWarranty.warranty_number}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <Badge className={statusConfig[getWarrantyStatus(selectedWarranty)]?.color}>
                    {statusConfig[getWarrantyStatus(selectedWarranty)]?.label}
                  </Badge>

                  <div>
                    <h3 className="font-medium text-lg">{selectedWarranty.title}</h3>
                    <Badge variant="outline" className="mt-1">
                      {warrantyTypeOptions.find(t => t.value === selectedWarranty.warranty_type)?.label}
                    </Badge>
                    {selectedWarranty.description && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedWarranty.description}</p>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage Period</p>
                        <p className="font-medium">
                          {format(new Date(selectedWarranty.start_date), 'MMM d, yyyy')} - {format(new Date(selectedWarranty.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {getWarrantyStatus(selectedWarranty) === 'active' && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{getDaysRemaining(selectedWarranty.end_date)}</p>
                          <p className="text-xs text-muted-foreground">days left</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedWarranty.projects?.name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Project</span>
                        <span>{selectedWarranty.projects.name}</span>
                      </div>
                    )}
                    {selectedWarranty.clients?.full_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Client</span>
                        <span>{selectedWarranty.clients.full_name}</span>
                      </div>
                    )}
                    {selectedWarranty.provider && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Provider</span>
                        <span>{selectedWarranty.provider}</span>
                      </div>
                    )}
                    {selectedWarranty.contact_info && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contact</span>
                        <span>{selectedWarranty.contact_info}</span>
                      </div>
                    )}
                  </div>

                  {selectedWarranty.coverage_details && (
                    <div>
                      <h4 className="font-medium mb-2">Coverage Details</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedWarranty.coverage_details}</p>
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

export default WarrantiesPage;
