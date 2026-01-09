import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Ship, Plus, Pencil, Trash2, Anchor, Loader2, ExternalLink } from 'lucide-react';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface Vessel {
  id: string;
  boat_name: string;
  hull_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  length: string | null;
  slip_location: string | null;
  engine_type: string | null;
  fuel_type: string | null;
  notes: string | null;
}

interface VesselManagementProps {
  clientId: string;
  companyId: string;
  readOnly?: boolean;
}

export const VesselManagement = ({ clientId, companyId, readOnly = false }: VesselManagementProps) => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [deleteVessel, setDeleteVessel] = useState<Vessel | null>(null);
  const [formData, setFormData] = useState({
    boat_name: '',
    hull_id: '',
    make: '',
    model: '',
    year: '',
    length: '',
    slip_location: '',
    engine_type: '',
    fuel_type: '',
    notes: '',
  });

  // Fetch vessels for this client
  const { data: vessels, isLoading } = useQuery({
    queryKey: ['client-vessels', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vessels')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('boat_name');
      return (data || []) as Vessel[];
    },
    enabled: !!clientId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('vessels')
        .insert({
          company_id: companyId,
          client_id: clientId,
          boat_name: data.boat_name,
          hull_id: data.hull_id || null,
          make: data.make || null,
          model: data.model || null,
          year: data.year ? parseInt(data.year) : null,
          length: data.length || null,
          slip_location: data.slip_location || null,
          engine_type: data.engine_type || null,
          fuel_type: data.fuel_type || null,
          notes: data.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vessel added');
      setShowAddDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['client-vessels'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('vessels')
        .update({
          boat_name: data.boat_name,
          hull_id: data.hull_id || null,
          make: data.make || null,
          model: data.model || null,
          year: data.year ? parseInt(data.year) : null,
          length: data.length || null,
          slip_location: data.slip_location || null,
          engine_type: data.engine_type || null,
          fuel_type: data.fuel_type || null,
          notes: data.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vessel updated');
      setEditingVessel(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['client-vessels'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessels')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vessel moved to trash');
      setDeleteVessel(null);
      queryClient.invalidateQueries({ queryKey: ['client-vessels'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      boat_name: '',
      hull_id: '',
      make: '',
      model: '',
      year: '',
      length: '',
      slip_location: '',
      engine_type: '',
      fuel_type: '',
      notes: '',
    });
  };

  const openEditDialog = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setFormData({
      boat_name: vessel.boat_name,
      hull_id: vessel.hull_id || '',
      make: vessel.make || '',
      model: vessel.model || '',
      year: vessel.year?.toString() || '',
      length: vessel.length || '',
      slip_location: vessel.slip_location || '',
      engine_type: vessel.engine_type || '',
      fuel_type: vessel.fuel_type || '',
      notes: vessel.notes || '',
    });
  };

  const handleSubmit = () => {
    if (!formData.boat_name.trim()) {
      toast.error('Boat name is required');
      return;
    }
    if (editingVessel) {
      updateMutation.mutate({ id: editingVessel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Vessels
          </CardTitle>
          <CardDescription>
            Boats and watercraft registered to this client
          </CardDescription>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vessel
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {vessels && vessels.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Make/Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Hull ID</TableHead>
                <TableHead>Location</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.map((vessel) => (
                <TableRow key={vessel.id}>
                  <TableCell className="font-medium">
                    <Link 
                      to={`/admin/vessels/${vessel.id}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Anchor className="h-4 w-4 text-primary" />
                      {vessel.boat_name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {vessel.make || vessel.model 
                      ? `${vessel.make || ''} ${vessel.model || ''}`.trim() 
                      : '-'}
                  </TableCell>
                  <TableCell>{vessel.year || '-'}</TableCell>
                  <TableCell>
                    {vessel.hull_id ? (
                      <Badge variant="outline">{vessel.hull_id}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{vessel.slip_location || '-'}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/admin/vessels/${vessel.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(vessel)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteVessel(vessel)}
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
            <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vessels registered for this client.</p>
            {!readOnly && (
              <p className="text-sm">Click "Add Vessel" to register a boat.</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || !!editingVessel} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingVessel(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVessel ? 'Edit Vessel' : 'Add Vessel'}
            </DialogTitle>
            <DialogDescription>
              {editingVessel 
                ? 'Update the vessel information' 
                : 'Register a new vessel for this client'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="boat_name">Boat Name *</Label>
                <Input
                  id="boat_name"
                  value={formData.boat_name}
                  onChange={(e) => setFormData({ ...formData, boat_name: e.target.value })}
                  placeholder="e.g., Sea Breeze"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hull_id">Hull ID / HIN</Label>
                <Input
                  id="hull_id"
                  value={formData.hull_id}
                  onChange={(e) => setFormData({ ...formData, hull_id: e.target.value })}
                  placeholder="e.g., ABC12345D789"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Boston Whaler"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Outrage 280"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 2022"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Input
                  id="length"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  placeholder="e.g., 28 ft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slip_location">Slip/Dock Location</Label>
                <Input
                  id="slip_location"
                  value={formData.slip_location}
                  onChange={(e) => setFormData({ ...formData, slip_location: e.target.value })}
                  placeholder="e.g., Marina Bay, Slip 42"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="engine_type">Engine Type</Label>
                <Input
                  id="engine_type"
                  value={formData.engine_type}
                  onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                  placeholder="e.g., Twin Outboard 300HP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Input
                  id="fuel_type"
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  placeholder="e.g., Gasoline, Diesel"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the vessel..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingVessel(null);
                resetForm();
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
              {editingVessel ? 'Save Changes' : 'Add Vessel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteVessel}
        onOpenChange={() => setDeleteVessel(null)}
        onConfirm={() => deleteVessel && deleteMutation.mutate(deleteVessel.id)}
        title="Vessel"
        itemName={deleteVessel?.boat_name || ''}
        itemType="item"
        loading={deleteMutation.isPending}
      />
    </Card>
  );
};
