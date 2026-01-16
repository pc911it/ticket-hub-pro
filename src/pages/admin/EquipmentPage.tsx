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
  Truck,
  Wrench,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-500/10 text-green-500' },
  in_use: { label: 'In Use', color: 'bg-blue-500/10 text-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-500/10 text-yellow-500' },
  retired: { label: 'Retired', color: 'bg-muted text-muted-foreground' },
};

const equipmentTypeOptions = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'tool', label: 'Tool' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'generator', label: 'Generator' },
  { value: 'other', label: 'Other' },
];

const EquipmentPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: '',
    make: '',
    model: '',
    year: '',
    serial_number: '',
    license_plate: '',
    vin: '',
    current_location: '',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    next_service_date: '',
    insurance_expiry: '',
    registration_expiry: '',
    notes: '',
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          projects:assigned_project_id(name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-equipment', effectiveCompanyId],
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('equipment').insert({
        company_id: effectiveCompanyId,
        name: data.name,
        equipment_type: data.equipment_type,
        make: data.make,
        model: data.model,
        year: data.year ? parseInt(data.year) : null,
        serial_number: data.serial_number,
        license_plate: data.license_plate,
        vin: data.vin,
        current_location: data.current_location,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        current_value: data.current_value ? parseFloat(data.current_value) : null,
        next_service_date: data.next_service_date || null,
        insurance_expiry: data.insurance_expiry || null,
        registration_expiry: data.registration_expiry || null,
        notes: data.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment added');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add equipment'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('equipment')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const assignProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const { error } = await supabase
        .from('equipment')
        .update({ 
          assigned_project_id: projectId,
          status: projectId ? 'in_use' : 'available'
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Assignment updated');
    },
    onError: () => toast.error('Failed to update assignment'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      equipment_type: '',
      make: '',
      model: '',
      year: '',
      serial_number: '',
      license_plate: '',
      vin: '',
      current_location: '',
      purchase_date: '',
      purchase_price: '',
      current_value: '',
      next_service_date: '',
      insurance_expiry: '',
      registration_expiry: '',
      notes: '',
    });
  };

  const filteredEquipment = equipment?.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.license_plate?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const needsAttention = equipment?.filter(eq => {
    const today = new Date();
    return (eq.next_service_date && new Date(eq.next_service_date) <= today) ||
           (eq.insurance_expiry && new Date(eq.insurance_expiry) <= today) ||
           (eq.registration_expiry && new Date(eq.registration_expiry) <= today);
  }) || [];

  const totalValue = equipment?.reduce((sum, eq) => sum + (eq.current_value || 0), 0) || 0;

  const stats = [
    { title: 'Total Equipment', value: equipment?.length || 0, icon: Truck, color: 'text-blue-500' },
    { title: 'Available', value: equipment?.filter(e => e.status === 'available').length || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'In Use', value: equipment?.filter(e => e.status === 'in_use').length || 0, icon: Wrench, color: 'text-yellow-500' },
    { title: 'Total Value', value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
  ];

  return (
    <FeatureGate featureKey="equipment_tracking" showUpgradePrompt featureName="Equipment & Vehicle Tracking">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipment & Vehicles</h1>
            <p className="text-muted-foreground">Track and manage your equipment fleet</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>

        {needsAttention.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{needsAttention.length} equipment need attention</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Service due, insurance expired, or registration expired
              </p>
            </CardContent>
          </Card>
        )}

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
              placeholder="Search equipment..."
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
          {filteredEquipment.map((eq) => (
            <Card 
              key={eq.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedEquipment(eq)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{eq.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {eq.make} {eq.model} {eq.year && `(${eq.year})`}
                    </p>
                  </div>
                  <Badge className={statusConfig[eq.status]?.color}>
                    {statusConfig[eq.status]?.label}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <Badge variant="outline">
                    {equipmentTypeOptions.find(t => t.value === eq.equipment_type)?.label}
                  </Badge>
                  
                  {eq.current_location && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {eq.current_location}
                    </p>
                  )}

                  {eq.projects?.name && (
                    <p className="text-muted-foreground">
                      Assigned to: {eq.projects.name}
                    </p>
                  )}

                  {eq.serial_number && (
                    <p className="text-xs font-mono text-muted-foreground">
                      S/N: {eq.serial_number}
                    </p>
                  )}
                </div>

                {eq.current_value && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-sm font-medium">${eq.current_value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground"> current value</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEquipment.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No equipment found
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Equipment name"
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select
                    value={formData.equipment_type}
                    onValueChange={(v) => setFormData({ ...formData, equipment_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label>Make</Label>
                  <Input
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="Manufacturer"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model name"
                  />
                </div>
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>License Plate</Label>
                  <Input
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>VIN</Label>
                  <Input
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current Location</Label>
                  <Input
                    value={formData.current_location}
                    onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                    placeholder="Yard, job site, etc."
                  />
                </div>
                <div>
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purchase Price ($)</Label>
                  <Input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Next Service Date</Label>
                  <Input
                    type="date"
                    value={formData.next_service_date}
                    onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Insurance Expiry</Label>
                  <Input
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Registration Expiry</Label>
                  <Input
                    type="date"
                    value={formData.registration_expiry}
                    onChange={(e) => setFormData({ ...formData, registration_expiry: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.name}>
                  {createMutation.isPending ? 'Adding...' : 'Add Equipment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedEquipment} onOpenChange={() => setSelectedEquipment(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedEquipment && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedEquipment.name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <Badge className={statusConfig[selectedEquipment.status]?.color}>
                    {statusConfig[selectedEquipment.status]?.label}
                  </Badge>

                  <div>
                    <p className="text-lg font-medium">
                      {selectedEquipment.make} {selectedEquipment.model} {selectedEquipment.year && `(${selectedEquipment.year})`}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {equipmentTypeOptions.find(t => t.value === selectedEquipment.equipment_type)?.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {selectedEquipment.serial_number && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Serial Number</span>
                        <span className="font-mono">{selectedEquipment.serial_number}</span>
                      </div>
                    )}
                    {selectedEquipment.license_plate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">License Plate</span>
                        <span>{selectedEquipment.license_plate}</span>
                      </div>
                    )}
                    {selectedEquipment.vin && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VIN</span>
                        <span className="font-mono text-xs">{selectedEquipment.vin}</span>
                      </div>
                    )}
                    {selectedEquipment.current_location && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span>{selectedEquipment.current_location}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedEquipment.current_value && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Current Value</p>
                        <p className="font-bold">${selectedEquipment.current_value.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedEquipment.purchase_price && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Purchase Price</p>
                        <p className="font-bold">${selectedEquipment.purchase_price.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Assign to Project */}
                  <div>
                    <Label>Assign to Project</Label>
                    <Select
                      value={selectedEquipment.assigned_project_id || ''}
                      onValueChange={(v) => assignProjectMutation.mutate({ 
                        id: selectedEquipment.id, 
                        projectId: v || null 
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Not assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not assigned</SelectItem>
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Update Status */}
                  <div>
                    <Label>Status</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <Button
                          key={key}
                          variant={selectedEquipment.status === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: selectedEquipment.id, status: key })}
                        >
                          {config.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Important Dates */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Important Dates</h4>
                    {selectedEquipment.next_service_date && (
                      <div className={`flex justify-between text-sm p-2 rounded ${new Date(selectedEquipment.next_service_date) <= new Date() ? 'bg-red-500/10 text-red-600' : ''}`}>
                        <span>Next Service</span>
                        <span>{format(new Date(selectedEquipment.next_service_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {selectedEquipment.insurance_expiry && (
                      <div className={`flex justify-between text-sm p-2 rounded ${new Date(selectedEquipment.insurance_expiry) <= new Date() ? 'bg-red-500/10 text-red-600' : ''}`}>
                        <span>Insurance Expiry</span>
                        <span>{format(new Date(selectedEquipment.insurance_expiry), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {selectedEquipment.registration_expiry && (
                      <div className={`flex justify-between text-sm p-2 rounded ${new Date(selectedEquipment.registration_expiry) <= new Date() ? 'bg-red-500/10 text-red-600' : ''}`}>
                        <span>Registration Expiry</span>
                        <span>{format(new Date(selectedEquipment.registration_expiry), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  );
};

export default EquipmentPage;
