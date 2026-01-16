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
  ClipboardCheck,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-500', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
  passed: { label: 'Passed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const inspectionTypeOptions = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'framing', label: 'Framing' },
  { value: 'electrical_rough', label: 'Electrical Rough-in' },
  { value: 'electrical_final', label: 'Electrical Final' },
  { value: 'plumbing_rough', label: 'Plumbing Rough-in' },
  { value: 'plumbing_final', label: 'Plumbing Final' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'final', label: 'Final Inspection' },
  { value: 'other', label: 'Other' },
];

const InspectionsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    permit_id: '',
    inspection_type: '',
    scheduled_date: '',
    scheduled_time: '',
    inspector_name: '',
    inspector_company: '',
  });

  const { data: inspections, isLoading } = useQuery({
    queryKey: ['inspections', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          projects:project_id(name),
          permits:permit_id(permit_number, title)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-inspections', effectiveCompanyId],
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

  const { data: permits } = useQuery({
    queryKey: ['permits-for-inspections', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('permits')
        .select('id, permit_number, title, project_id')
        .eq('company_id', effectiveCompanyId);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const generateInspectionNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId);
    return `INSP-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const inspNumber = await generateInspectionNumber();
      const { error } = await supabase.from('inspections').insert({
        company_id: effectiveCompanyId,
        inspection_number: inspNumber,
        title: data.title,
        description: data.description,
        project_id: data.project_id || null,
        permit_id: data.permit_id || null,
        inspection_type: data.inspection_type,
        scheduled_date: data.scheduled_date || null,
        scheduled_time: data.scheduled_time || null,
        inspector_name: data.inspector_name,
        inspector_company: data.inspector_company,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection scheduled');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to schedule inspection'),
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, result, notes }: { id: string; result: string; notes?: string }) => {
      const updates: any = { 
        status: result,
        result,
        completed_date: new Date().toISOString().split('T')[0],
        result_notes: notes,
      };
      if (result === 'failed') {
        updates.reinspection_required = true;
      }
      
      const { error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Inspection result recorded');
      setSelectedInspection(null);
    },
    onError: () => toast.error('Failed to update result'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      permit_id: '',
      inspection_type: '',
      scheduled_date: '',
      scheduled_time: '',
      inspector_name: '',
      inspector_company: '',
    });
  };

  const filteredInspections = inspections?.filter(insp => {
    const matchesSearch = insp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspection_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || insp.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = [
    { title: 'Total', value: inspections?.length || 0, icon: ClipboardCheck, color: 'text-blue-500' },
    { title: 'Scheduled', value: inspections?.filter(i => i.status === 'scheduled').length || 0, icon: Calendar, color: 'text-purple-500' },
    { title: 'Passed', value: inspections?.filter(i => i.status === 'passed').length || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Failed', value: inspections?.filter(i => i.status === 'failed').length || 0, icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <FeatureGate featureKey="inspections" showUpgradePrompt featureName="Inspections">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inspections</h1>
            <p className="text-muted-foreground">Schedule and track project inspections</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Inspection
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
              placeholder="Search inspections..."
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
                    <th className="p-4 font-medium">Inspection</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Project</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Scheduled</th>
                    <th className="p-4 font-medium">Inspector</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((insp) => {
                    const StatusIcon = statusConfig[insp.status]?.icon || ClipboardCheck;
                    return (
                      <tr 
                        key={insp.id} 
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedInspection(insp)}
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{insp.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{insp.inspection_number}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            {inspectionTypeOptions.find(t => t.value === insp.inspection_type)?.label || insp.inspection_type}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">{insp.projects?.name || '-'}</td>
                        <td className="p-4">
                          <Badge className={statusConfig[insp.status]?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[insp.status]?.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {insp.scheduled_date ? (
                            <>
                              {format(new Date(insp.scheduled_date), 'MMM d, yyyy')}
                              {insp.scheduled_time && <span className="text-muted-foreground"> at {insp.scheduled_time}</span>}
                            </>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-sm">{insp.inspector_name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredInspections.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No inspections found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Inspection</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Inspection title"
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
                  <Label>Inspection Type *</Label>
                  <Select
                    value={formData.inspection_type}
                    onValueChange={(v) => setFormData({ ...formData, inspection_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {inspectionTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Permit</Label>
                  <Select
                    value={formData.permit_id}
                    onValueChange={(v) => setFormData({ ...formData, permit_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to permit" />
                    </SelectTrigger>
                    <SelectContent>
                      {permits?.filter(p => !formData.project_id || p.project_id === formData.project_id).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.permit_number} - {p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Scheduled Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Inspector Name</Label>
                  <Input
                    value={formData.inspector_name}
                    onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Inspector Company</Label>
                  <Input
                    value={formData.inspector_company}
                    onChange={(e) => setFormData({ ...formData, inspector_company: e.target.value })}
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

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.title || !formData.inspection_type}>
                  {createMutation.isPending ? 'Scheduling...' : 'Schedule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedInspection && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedInspection.inspection_number}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <Badge className={statusConfig[selectedInspection.status]?.color}>
                    {statusConfig[selectedInspection.status]?.label}
                  </Badge>

                  <div>
                    <h3 className="font-medium text-lg">{selectedInspection.title}</h3>
                    <Badge variant="outline" className="mt-1">
                      {inspectionTypeOptions.find(t => t.value === selectedInspection.inspection_type)?.label}
                    </Badge>
                    {selectedInspection.description && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedInspection.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {selectedInspection.projects?.name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Project</span>
                        <span>{selectedInspection.projects.name}</span>
                      </div>
                    )}
                    {selectedInspection.permits && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Permit</span>
                        <span>{selectedInspection.permits.permit_number}</span>
                      </div>
                    )}
                    {selectedInspection.scheduled_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Scheduled</span>
                        <span>
                          {format(new Date(selectedInspection.scheduled_date), 'MMM d, yyyy')}
                          {selectedInspection.scheduled_time && ` at ${selectedInspection.scheduled_time}`}
                        </span>
                      </div>
                    )}
                    {selectedInspection.inspector_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Inspector</span>
                        <span>{selectedInspection.inspector_name}</span>
                      </div>
                    )}
                  </div>

                  {(selectedInspection.status === 'scheduled' || selectedInspection.status === 'in_progress') && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Record Result</h4>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-600"
                          onClick={() => updateResultMutation.mutate({ id: selectedInspection.id, result: 'failed' })}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Failed
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => updateResultMutation.mutate({ id: selectedInspection.id, result: 'passed' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Passed
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedInspection.result && (
                    <div className={`p-4 rounded-lg ${selectedInspection.result === 'passed' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center gap-2">
                        {selectedInspection.result === 'passed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${selectedInspection.result === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedInspection.result === 'passed' ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {selectedInspection.completed_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          on {format(new Date(selectedInspection.completed_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      {selectedInspection.result_notes && (
                        <p className="text-sm mt-2">{selectedInspection.result_notes}</p>
                      )}
                    </div>
                  )}

                  {selectedInspection.reinspection_required && (
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Reinspection Required</span>
                      </div>
                      {selectedInspection.reinspection_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Scheduled for {format(new Date(selectedInspection.reinspection_date), 'MMM d, yyyy')}
                        </p>
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

export default InspectionsPage;
