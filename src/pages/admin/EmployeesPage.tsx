import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  MapPin, 
  Phone, 
  Truck, 
  Edit2, 
  User,
  Signal,
  SignalZero,
  UserPlus,
  Power,
  UserCheck
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
  user_id: string;
  company_id: string;
}

interface CompanyUser {
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const EmployeesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_info: '',
  });
  const [addFormData, setAddFormData] = useState({
    user_id: '',
    full_name: '',
    phone: '',
    vehicle_info: '',
  });

  useEffect(() => {
    if (user) {
      fetchCompanyAndAgents();
    }
  }, [user]);

  const fetchCompanyAndAgents = async () => {
    try {
      // Get user's company
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (memberData?.company_id) {
        setCompanyId(memberData.company_id);
        
        // Fetch agents for this company
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select('*')
          .eq('company_id', memberData.company_id)
          .order('full_name');

        if (error) throw error;
        setAgents(agentsData || []);

        // Fetch company members who are not already agents
        const { data: membersData } = await supabase
          .from('company_members')
          .select('user_id')
          .eq('company_id', memberData.company_id);

        if (membersData && membersData.length > 0) {
          // Get profiles for these users
          const userIds = membersData.map(m => m.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          // Filter out users who are already agents
          const agentUserIds = (agentsData || []).map(a => a.user_id);
          const availableUsers = (profilesData || [])
            .filter(p => !agentUserIds.includes(p.user_id))
            .map(p => ({
              user_id: p.user_id,
              profiles: { full_name: p.full_name, email: p.email }
            }));
          setCompanyUsers(availableUsers);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
          fetchCompanyAndAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (companyId) {
      return setupRealtimeSubscription();
    }
  }, [companyId]);

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
        fetchCompanyAndAgents();
        setIsDialogOpen(false);
      }
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company found.' });
      return;
    }

    if (!addFormData.full_name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a name.' });
      return;
    }

    // If no user selected, we need a user_id - for now require selection
    if (!addFormData.user_id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a user to add as agent.' });
      return;
    }

    const { error } = await supabase
      .from('agents')
      .insert({
        company_id: companyId,
        user_id: addFormData.user_id,
        full_name: addFormData.full_name,
        phone: addFormData.phone || null,
        vehicle_info: addFormData.vehicle_info || null,
      });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add agent.' });
    } else {
      toast({ title: 'Success', description: 'Agent added successfully.' });
      fetchCompanyAndAgents();
      setIsAddDialogOpen(false);
      setAddFormData({ user_id: '', full_name: '', phone: '', vehicle_info: '' });
    }
  };

  const handleToggleOnline = async (agent: Agent) => {
    const { error } = await supabase
      .from('agents')
      .update({ is_online: !agent.is_online })
      .eq('id', agent.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    } else {
      toast({ title: 'Success', description: `${agent.full_name} is now ${!agent.is_online ? 'online' : 'offline'}.` });
      fetchCompanyAndAgents();
    }
  };

  const handleToggleAvailable = async (agent: Agent) => {
    const { error } = await supabase
      .from('agents')
      .update({ is_available: !agent.is_available })
      .eq('id', agent.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update availability.' });
    } else {
      toast({ title: 'Success', description: `${agent.full_name} is now ${!agent.is_available ? 'available' : 'busy'}.` });
      fetchCompanyAndAgents();
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add New Agent</DialogTitle>
              <DialogDescription>Add a company member as a field agent.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User *</Label>
                <Select 
                  value={addFormData.user_id} 
                  onValueChange={(value) => {
                    const selectedUser = companyUsers.find(u => u.user_id === value);
                    setAddFormData({ 
                      ...addFormData, 
                      user_id: value,
                      full_name: selectedUser?.profiles?.full_name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyUsers.length === 0 ? (
                      <SelectItem value="none" disabled>No available users</SelectItem>
                    ) : (
                      companyUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.profiles?.full_name || u.profiles?.email || 'Unknown User'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {companyUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All company members are already agents, or no users exist yet.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addName">Full Name *</Label>
                <Input
                  id="addName"
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addPhone">Phone</Label>
                <Input
                  id="addPhone"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addVehicle">Vehicle Info</Label>
                <Input
                  id="addVehicle"
                  value={addFormData.vehicle_info}
                  onChange={(e) => setAddFormData({ ...addFormData, vehicle_info: e.target.value })}
                  placeholder="e.g., White Ford F-150"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={companyUsers.length === 0}>Add Agent</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

                <div className="mt-4 space-y-3">
                  {/* Status Toggles */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Power className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Online</span>
                    </div>
                    <Switch
                      checked={agent.is_online}
                      onCheckedChange={() => handleToggleOnline(agent)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Available</span>
                    </div>
                    <Switch
                      checked={agent.is_available}
                      onCheckedChange={() => handleToggleAvailable(agent)}
                      disabled={!agent.is_online}
                    />
                  </div>

                  {/* Agent Info */}
                  <div className="space-y-2 text-sm text-muted-foreground pt-2 border-t">
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