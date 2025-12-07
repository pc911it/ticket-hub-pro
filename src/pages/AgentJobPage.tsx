import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, Clock, User, Package, Plus, Minus, CheckCircle, 
  Truck, AlertTriangle, ArrowLeft, Phone, Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  scheduled_date: string;
  scheduled_time: string;
  clients: { full_name: string; phone: string | null; address: string | null } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity_in_stock: number;
  unit: string | null;
}

interface MaterialUsage {
  id: string;
  inventory_item_id: string;
  quantity_planned: number | null;
  quantity_used: number;
  inventory_items: { name: string; unit: string | null } | null;
}

const statusOptions = [
  { value: 'assigned', label: 'Assigned', color: 'bg-muted text-muted-foreground' },
  { value: 'en_route', label: 'En Route', color: 'bg-info/10 text-info' },
  { value: 'on_site', label: 'On Site', color: 'bg-warning/10 text-warning' },
  { value: 'working', label: 'Working', color: 'bg-primary/10 text-primary' },
  { value: 'completed', label: 'Completed', color: 'bg-success/10 text-success' },
];

const AgentJobPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agent, setAgent] = useState<{ id: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ item_id: '', quantity: 1 });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchAgentAndTickets();
    }
  }, [user]);

  const fetchAgentAndTickets = async () => {
    if (!user) return;

    // Get agent record for current user
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (agentData) {
      setAgent(agentData);

      // Fetch assigned tickets
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, scheduled_date, scheduled_time, clients(full_name, phone, address)')
        .eq('assigned_agent_id', agentData.id)
        .in('status', ['assigned', 'en_route', 'on_site', 'working', 'pending'])
        .order('scheduled_date', { ascending: true });

      if (ticketsData) setTickets(ticketsData);
    }

    // Fetch inventory for adding materials
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('id, name, quantity_in_stock, unit')
      .gt('quantity_in_stock', 0)
      .order('name');

    if (inventoryData) setInventory(inventoryData);
    setLoading(false);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNotes('');

    // Fetch materials for this ticket
    const { data: materialsData } = await supabase
      .from('inventory_usage')
      .select('id, inventory_item_id, quantity_planned, quantity_used, inventory_items(name, unit)')
      .eq('ticket_id', ticket.id);

    if (materialsData) setMaterials(materialsData);
  };

  const updateTicketStatus = async (newStatus: string) => {
    if (!selectedTicket || !agent) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', selectedTicket.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
      return;
    }

    // Create job update record
    await supabase.from('job_updates').insert({
      ticket_id: selectedTicket.id,
      agent_id: agent.id,
      status: newStatus as any,
      notes: notes || null,
    });

    setSelectedTicket({ ...selectedTicket, status: newStatus });
    toast({ title: 'Status Updated', description: `Job status changed to ${newStatus}.` });

    if (newStatus === 'completed') {
      fetchAgentAndTickets();
      setSelectedTicket(null);
    }
  };

  const updateMaterialQuantity = async (usageId: string, newQuantity: number) => {
    const usage = materials.find(m => m.id === usageId);
    if (!usage) return;

    const diff = newQuantity - usage.quantity_used;

    // Update usage record
    const { error } = await supabase
      .from('inventory_usage')
      .update({ quantity_used: newQuantity })
      .eq('id', usageId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update quantity.' });
      return;
    }

    // Update inventory stock (subtract the difference)
    if (diff !== 0) {
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('quantity_in_stock')
        .eq('id', usage.inventory_item_id)
        .single();

      if (currentItem) {
        const newStock = Math.max(0, currentItem.quantity_in_stock - diff);
        await supabase
          .from('inventory_items')
          .update({ quantity_in_stock: newStock })
          .eq('id', usage.inventory_item_id);
      }
    }

    setMaterials(materials.map(m => 
      m.id === usageId ? { ...m, quantity_used: newQuantity } : m
    ));
    
    toast({ title: 'Updated', description: 'Material quantity updated.' });
  };

  const addMaterial = async () => {
    if (!selectedTicket || !agent || !newMaterial.item_id) return;

    const item = inventory.find(i => i.id === newMaterial.item_id);
    if (!item) return;

    // Insert usage record
    const { data: usageData, error } = await supabase
      .from('inventory_usage')
      .insert({
        ticket_id: selectedTicket.id,
        inventory_item_id: newMaterial.item_id,
        agent_id: agent.id,
        quantity_used: newMaterial.quantity,
        quantity_planned: 0,
        usage_type: 'field_added',
      })
      .select('id, inventory_item_id, quantity_planned, quantity_used')
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add material.' });
      return;
    }

    // Deduct from inventory
    const newStock = Math.max(0, item.quantity_in_stock - newMaterial.quantity);
    await supabase
      .from('inventory_items')
      .update({ quantity_in_stock: newStock })
      .eq('id', newMaterial.item_id);

    setMaterials([
      ...materials,
      {
        ...usageData,
        inventory_items: { name: item.name, unit: item.unit },
      },
    ]);

    setIsAddMaterialOpen(false);
    setNewMaterial({ item_id: '', quantity: 1 });
    toast({ title: 'Added', description: 'Material added to job.' });
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-warning/10 text-warning';
      case 'normal': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-warning mb-4" />
        <h1 className="text-xl font-semibold mb-2">Agent Access Required</h1>
        <p className="text-muted-foreground text-center mb-4">
          Your account is not registered as a field agent.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Link>
      </div>
    );
  }

  // Job Detail View
  if (selectedTicket) {
    const currentStatusIndex = statusOptions.findIndex(s => s.value === selectedTicket.status);

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate">{selectedTicket.title}</h1>
              <p className="text-sm text-muted-foreground">{selectedTicket.clients?.full_name}</p>
            </div>
            <Badge className={getPriorityColor(selectedTicket.priority)}>
              {selectedTicket.priority || 'Normal'}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-24">
          {/* Client Info Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {selectedTicket.clients?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{selectedTicket.clients.address}</p>
                    <Button variant="link" size="sm" className="p-0 h-auto text-primary" asChild>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(selectedTicket.clients.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Navigate
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              {selectedTicket.clients?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a href={`tel:${selectedTicket.clients.phone}`} className="text-sm text-primary">
                    {selectedTicket.clients.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm">
                  {format(new Date(selectedTicket.scheduled_date), 'MMM d, yyyy')} at {selectedTicket.scheduled_time}
                </p>
              </div>
              {selectedTicket.description && (
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  {selectedTicket.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Update */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status, idx) => (
                  <Button
                    key={status.value}
                    variant={selectedTicket.status === status.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateTicketStatus(status.value)}
                    disabled={idx < currentStatusIndex}
                    className={cn(
                      idx < currentStatusIndex && 'opacity-50'
                    )}
                  >
                    {status.value === 'completed' && <CheckCircle className="h-4 w-4 mr-1" />}
                    {status.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about the job..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Materials Used */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Materials Used
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setIsAddMaterialOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No materials logged yet
                </p>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {material.inventory_items?.name}
                        </p>
                        {material.quantity_planned && material.quantity_planned > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Planned: {material.quantity_planned} {material.inventory_items?.unit || 'units'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateMaterialQuantity(material.id, Math.max(0, material.quantity_used - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {material.quantity_used}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateMaterialQuantity(material.id, material.quantity_used + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-10">
                          {material.inventory_items?.unit || 'units'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Material Dialog */}
        <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Select
                  value={newMaterial.item_id}
                  onValueChange={(val) => setNewMaterial({ ...newMaterial, item_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory
                      .filter(i => !materials.some(m => m.inventory_item_id === i.id))
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.quantity_in_stock} {item.unit || 'units'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addMaterial} disabled={!newMaterial.item_id}>
                Add Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Jobs List View
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold">My Jobs</h1>
            <p className="text-sm text-muted-foreground">{tickets.length} active job{tickets.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active jobs assigned to you.</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => selectTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold">{ticket.title}</h3>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority || 'Normal'}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {ticket.clients?.full_name}
                  </div>
                  {ticket.clients?.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{ticket.clients.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(ticket.scheduled_date), 'MMM d')} at {ticket.scheduled_time}
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className={
                    statusOptions.find(s => s.value === ticket.status)?.color
                  }>
                    {statusOptions.find(s => s.value === ticket.status)?.label || ticket.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentJobPage;
