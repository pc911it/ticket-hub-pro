import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Settings2, Loader2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ServiceTypesPage() {
  const { user, isCompanyOwner, isCompanyAdmin, isSuperAdmin } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [deleteType, setDeleteType] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const canManage = isCompanyOwner || isCompanyAdmin || isSuperAdmin;

  // Fetch company type for default service types
  const { data: company } = useQuery({
    queryKey: ['company-type', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const { data } = await supabase
        .from('companies')
        .select('type')
        .eq('id', effectiveCompanyId)
        .single();
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  // Fetch custom service types
  const { data: serviceTypes, isLoading } = useQuery({
    queryKey: ['service-types', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('company_service_types')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null)
        .order('name');
      return (data || []) as ServiceType[];
    },
    enabled: !!effectiveCompanyId,
  });

  // Get default service types based on company type
  const getDefaultServiceTypes = (companyType: string) => {
    const defaults: Record<string, string[]> = {
      boat_services: [
        'Hull Cleaning', 'Engine Service', 'Electrical Repair', 'Fiberglass Repair',
        'Bottom Painting', 'Electronics Install', 'Detailing', 'Winterization',
        'Trailer Service', 'Rigging', 'Canvas/Upholstery', 'AC/Refrigeration'
      ],
      alarm_company: [
        'Installation', 'Repair', 'Inspection', 'Monitoring Setup',
        'Panel Replacement', 'Sensor Add', 'False Alarm Service'
      ],
      electrician: [
        'Panel Upgrade', 'Outlet Install', 'Lighting', 'Rewiring',
        'EV Charger Install', 'Generator Install', 'Troubleshooting'
      ],
      plumber: [
        'Drain Cleaning', 'Pipe Repair', 'Water Heater', 'Fixture Install',
        'Leak Detection', 'Sewer Line', 'Bathroom Remodel'
      ],
      hvac: [
        'AC Repair', 'Furnace Repair', 'Installation', 'Maintenance',
        'Duct Cleaning', 'Thermostat Install', 'Air Quality'
      ],
      security: [
        'Camera Install', 'Access Control', 'Alarm Setup', 'Monitoring',
        'System Upgrade', 'Patrol Service'
      ],
      locksmith: [
        'Lockout Service', 'Rekey', 'Lock Install', 'Key Duplication',
        'Safe Service', 'Access Control'
      ],
      tow_company: [
        'Light Duty Tow', 'Medium Duty Tow', 'Heavy Duty Tow', 'Flatbed',
        'Roadside Assist', 'Winch Out', 'Jump Start', 'Tire Change'
      ],
      other: ['Service', 'Repair', 'Installation', 'Consultation', 'Maintenance']
    };
    return defaults[companyType] || defaults.other;
  };

  const defaultTypes = company?.type ? getDefaultServiceTypes(company.type) : [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!effectiveCompanyId) throw new Error('No company found');
      const { error } = await supabase
        .from('company_service_types')
        .insert({
          company_id: effectiveCompanyId,
          name: data.name,
          description: data.description || null,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service type created');
      setShowAddDialog(false);
      setFormData({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceType> }) => {
      const { error } = await supabase
        .from('company_service_types')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service type updated');
      setEditingType(null);
      setFormData({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_service_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service type moved to trash');
      setDeleteType(null);
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Toggle active status
  const toggleActive = (type: ServiceType) => {
    updateMutation.mutate({ id: type.id, data: { is_active: !type.is_active } });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        data: { name: formData.name, description: formData.description || null },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (type: ServiceType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description || '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Types</h1>
          <p className="text-muted-foreground">
            Manage custom service types for your business
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service Type
          </Button>
        )}
      </div>

      {/* Default Service Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Default Service Types
          </CardTitle>
          <CardDescription>
            Pre-configured service types based on your business type ({company?.type?.replace('_', ' ') || 'General'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {defaultTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Service Types */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Service Types</CardTitle>
          <CardDescription>
            Additional service types you've added for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceTypes && serviceTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={type.is_active}
                          onCheckedChange={() => toggleActive(type)}
                          disabled={!canManage}
                        />
                        <span className="text-sm">
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteType(type)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom service types added yet.</p>
              <p className="text-sm">Click "Add Service Type" to create one.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || !!editingType} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingType(null);
            setFormData({ name: '', description: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Service Type' : 'Add Service Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType 
                ? 'Update the service type details' 
                : 'Create a new custom service type for your business'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emergency Repair"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingType(null);
                setFormData({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingType ? 'Save Changes' : 'Add Service Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteType}
        onOpenChange={() => setDeleteType(null)}
        onConfirm={() => deleteType && deleteMutation.mutate(deleteType.id)}
        title="Service Type"
        itemName={deleteType?.name || ''}
        itemType="item"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
