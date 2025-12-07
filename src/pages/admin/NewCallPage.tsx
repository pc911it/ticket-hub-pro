import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Phone, MapPin, User, Clock, AlertTriangle, Truck, Flame, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MaterialAssignment, MaterialAssignmentItem, saveInventoryUsage } from '@/components/MaterialAssignment';

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
}

interface Agent {
  id: string;
  full_name: string;
  is_available: boolean;
  is_online: boolean;
  phone: string | null;
}

const callTypes = [
  { value: 'fire_alarm', label: 'Fire Alarm', icon: Flame, color: 'text-destructive' },
  { value: 'security_alarm', label: 'Security Alarm', icon: Shield, color: 'text-warning' },
  { value: 'tow_service', label: 'Tow Service', icon: Truck, color: 'text-info' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
  { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'bg-info/10 text-info' },
  { value: 'high', label: 'High', color: 'bg-warning/10 text-warning' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
];

const NewCallPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [materials, setMaterials] = useState<MaterialAssignmentItem[]>([]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    call_type: '',
    priority: 'normal',
    assigned_agent_id: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: format(new Date(), 'HH:mm'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, agentsRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, phone, address').order('full_name'),
        supabase.from('agents').select('id, full_name, is_available, is_online, phone').order('full_name'),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (agentsRes.data) setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData({ ...formData, client_id: clientId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: ticketData, error } = await supabase.from('tickets').insert({
        client_id: formData.client_id,
        title: formData.title,
        description: formData.description,
        call_type: formData.call_type,
        priority: formData.priority,
        assigned_agent_id: formData.assigned_agent_id || null,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        status: formData.assigned_agent_id ? 'assigned' : 'pending',
        call_started_at: new Date().toISOString(),
        created_by: user?.id,
      }).select('id').single();

      if (error) throw error;

      // Save material assignments and deduct inventory
      if (materials.length > 0 && ticketData) {
        const { error: materialError } = await saveInventoryUsage(
          ticketData.id,
          materials,
          formData.assigned_agent_id || undefined
        );
        if (materialError) {
          console.error('Error saving materials:', materialError);
        }
      }

      toast({ title: 'Success', description: 'Call created and assigned successfully.' });
      navigate('/admin');
    } catch (error: any) {
      console.error('Error creating call:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Failed to create call.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const availableAgents = agents.filter(a => a.is_online && a.is_available);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">New Call</h1>
        <p className="text-muted-foreground mt-1">Create and dispatch a new service call.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Call Type Selection */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display text-lg">Call Type</CardTitle>
            <CardDescription>Select the type of service call.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {callTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, call_type: type.value })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    formData.call_type === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <type.icon className={cn("h-6 w-6", type.color)} />
                  <span className="text-xs font-medium text-center">{type.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client & Details */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display text-lg">Call Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={handleClientChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {client.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", p.color)}>
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClient && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                {selectedClient.phone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedClient.phone}
                  </p>
                )}
                {selectedClient.address && (
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedClient.address}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the call"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the call..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Assignment */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display text-lg">Assign Agent</CardTitle>
            <CardDescription>
              {availableAgents.length} agent{availableAgents.length !== 1 ? 's' : ''} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No agents registered yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    disabled={!agent.is_online}
                    onClick={() => setFormData({ ...formData, assigned_agent_id: agent.id })}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                      formData.assigned_agent_id === agent.id
                        ? "border-primary bg-primary/5"
                        : agent.is_online
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-medium">{agent.full_name.charAt(0)}</span>
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                          agent.is_online ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.is_online 
                          ? agent.is_available ? 'Available' : 'Busy' 
                          : 'Offline'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Materials Assignment */}
        <MaterialAssignment
          value={materials}
          onChange={setMaterials}
          disabled={submitting}
        />

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !formData.client_id || !formData.title}>
            {submitting ? 'Creating...' : 'Create Call'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewCallPage;