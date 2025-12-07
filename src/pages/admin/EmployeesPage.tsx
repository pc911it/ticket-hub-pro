import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Truck, 
  Edit2, 
  User,
  Signal,
  SignalZero
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_info: string | null;
  is_available: boolean;
  is_online: boolean;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  created_at: string;
}

const EmployeesPage = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_info: '',
  });

  useEffect(() => {
    fetchAgents();
    setupRealtimeSubscription();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('agents-employees-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        full_name: agent.full_name,
        phone: agent.phone || '',
        vehicle_info: agent.vehicle_info || '',
      });
    } else {
      setEditingAgent(null);
      setFormData({
        full_name: '',
        phone: '',
        vehicle_info: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAgent) {
      const { error } = await supabase
        .from('agents')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          vehicle_info: formData.vehicle_info || null,
        })
        .eq('id', editingAgent.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update agent.' });
      } else {
        toast({ title: 'Success', description: 'Agent updated successfully.' });
        fetchAgents();
        setIsDialogOpen(false);
      }
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.phone?.includes(searchQuery) ||
    agent.vehicle_info?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = agents.filter(a => a.is_online).length;
  const availableCount = agents.filter(a => a.is_online && a.is_available).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">
            {onlineCount} online, {availableCount} available of {agents.length} total agents.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No agents found matching your search.' : 'No agents registered yet.'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Agents will appear here when they sign up and are linked to your company.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent, index) => (
            <Card
              key={agent.id}
              className="border-0 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold">{agent.full_name.charAt(0)}</span>
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                        agent.is_online ? "bg-success" : "bg-muted-foreground"
                      )}
                    >
                      {agent.is_online ? (
                        <Signal className="h-2.5 w-2.5 text-background" />
                      ) : (
                        <SignalZero className="h-2.5 w-2.5 text-background" />
                      )}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{agent.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={agent.is_online ? (agent.is_available ? "default" : "secondary") : "outline"}>
                        {agent.is_online ? (agent.is_available ? 'Available' : 'Busy') : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                  <Dialog open={isDialogOpen && editingAgent?.id === agent.id} onOpenChange={(open) => {
                    if (!open) setIsDialogOpen(false);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(agent)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">Edit Agent</DialogTitle>
                        <DialogDescription>Update agent information.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicle">Vehicle Info</Label>
                          <Input
                            id="vehicle"
                            value={formData.vehicle_info}
                            onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                            placeholder="e.g., White Ford F-150"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Save</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {agent.phone}
                    </div>
                  )}
                  {agent.vehicle_info && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {agent.vehicle_info}
                    </div>
                  )}
                  {agent.last_location_update && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Last seen {formatDistanceToNow(new Date(agent.last_location_update), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;