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
import { Phone, MapPin, User, Clock, AlertTriangle, Flame, Shield, FolderOpen, Droplets, Zap, Camera, Square, HardHat, Anchor, Ship, Waves, Cable, Radio, Compass, Wrench, Settings, Gauge, Thermometer, Wind, Navigation, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MaterialAssignment, MaterialAssignmentItem, saveInventoryUsage } from '@/components/MaterialAssignment';
import { VesselSelector } from '@/components/VesselSelector';

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

interface Project {
  id: string;
  name: string;
  status: string;
}

// Call types organized by business type
const callTypesByBusiness: Record<string, Array<{ value: string; label: string; icon: any; color: string }>> = {
  // Boat Services & Marine
  boat_services: [
    { value: 'hull_repair', label: 'Hull Repair', icon: Ship, color: 'text-info' },
    { value: 'engine_service', label: 'Engine Service', icon: Settings, color: 'text-warning' },
    { value: 'fiberglass_repair', label: 'Fiberglass Repair', icon: Wrench, color: 'text-primary' },
    { value: 'gel_coat', label: 'Gel Coat', icon: Droplets, color: 'text-info' },
    { value: 'electronics_install', label: 'Electronics Install', icon: Radio, color: 'text-success' },
    { value: 'navigation_systems', label: 'Navigation Systems', icon: Compass, color: 'text-primary' },
    { value: 'marine_electrical', label: 'Marine Electrical', icon: Zap, color: 'text-warning' },
    { value: 'fiber_optic', label: 'Fiber Optic', icon: Cable, color: 'text-success' },
    { value: 'ac_refrigeration', label: 'A/C & Refrigeration', icon: Thermometer, color: 'text-info' },
    { value: 'plumbing_marine', label: 'Marine Plumbing', icon: Droplets, color: 'text-info' },
    { value: 'canvas_upholstery', label: 'Canvas & Upholstery', icon: Square, color: 'text-muted-foreground' },
    { value: 'bottom_paint', label: 'Bottom Paint', icon: Anchor, color: 'text-primary' },
    { value: 'detailing', label: 'Detailing', icon: Waves, color: 'text-info' },
    { value: 'winterization', label: 'Winterization', icon: Wind, color: 'text-muted-foreground' },
    { value: 'sea_trial', label: 'Sea Trial', icon: Navigation, color: 'text-success' },
    { value: 'emergency_marine', label: 'Marine Emergency', icon: AlertTriangle, color: 'text-destructive' },
  ],
  // Alarm Company
  alarm_company: [
    { value: 'fire_alarm', label: 'Fire Alarm', icon: Flame, color: 'text-destructive' },
    { value: 'security_alarm', label: 'Security Alarm', icon: Shield, color: 'text-warning' },
    { value: 'security_cameras', label: 'Security Cameras', icon: Camera, color: 'text-primary' },
    { value: 'access_control', label: 'Access Control', icon: Shield, color: 'text-info' },
    { value: 'monitoring', label: 'Monitoring Setup', icon: Radio, color: 'text-success' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // Electrician
  electrician: [
    { value: 'electrical', label: 'Electrical', icon: Zap, color: 'text-warning' },
    { value: 'fiber_optic', label: 'Fiber Optic', icon: Cable, color: 'text-success' },
    { value: 'network_cabling', label: 'Network Cabling', icon: Wifi, color: 'text-info' },
    { value: 'panel_upgrade', label: 'Panel Upgrade', icon: Gauge, color: 'text-primary' },
    { value: 'generator', label: 'Generator', icon: Zap, color: 'text-warning' },
    { value: 'lighting', label: 'Lighting', icon: Zap, color: 'text-warning' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // Plumber
  plumber: [
    { value: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-info' },
    { value: 'drain_cleaning', label: 'Drain Cleaning', icon: Droplets, color: 'text-info' },
    { value: 'water_heater', label: 'Water Heater', icon: Thermometer, color: 'text-warning' },
    { value: 'leak_repair', label: 'Leak Repair', icon: Droplets, color: 'text-destructive' },
    { value: 'pipe_replacement', label: 'Pipe Replacement', icon: Wrench, color: 'text-muted-foreground' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // HVAC
  hvac: [
    { value: 'ac_service', label: 'A/C Service', icon: Wind, color: 'text-info' },
    { value: 'heating', label: 'Heating', icon: Flame, color: 'text-warning' },
    { value: 'duct_work', label: 'Duct Work', icon: Wind, color: 'text-muted-foreground' },
    { value: 'refrigeration', label: 'Refrigeration', icon: Thermometer, color: 'text-info' },
    { value: 'installation', label: 'Installation', icon: Wrench, color: 'text-primary' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // Security
  security: [
    { value: 'security_alarm', label: 'Security Alarm', icon: Shield, color: 'text-warning' },
    { value: 'security_cameras', label: 'Security Cameras', icon: Camera, color: 'text-primary' },
    { value: 'access_control', label: 'Access Control', icon: Shield, color: 'text-info' },
    { value: 'patrol', label: 'Patrol', icon: Shield, color: 'text-muted-foreground' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // Locksmith
  locksmith: [
    { value: 'lock_change', label: 'Lock Change', icon: Shield, color: 'text-primary' },
    { value: 'lockout', label: 'Lockout', icon: AlertTriangle, color: 'text-warning' },
    { value: 'key_duplication', label: 'Key Duplication', icon: Wrench, color: 'text-muted-foreground' },
    { value: 'safe_service', label: 'Safe Service', icon: Shield, color: 'text-info' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
  // Tow Company
  tow_company: [
    { value: 'tow_service', label: 'Tow Service', icon: Wrench, color: 'text-primary' },
    { value: 'roadside_assist', label: 'Roadside Assist', icon: AlertTriangle, color: 'text-warning' },
    { value: 'flatbed', label: 'Flatbed', icon: Wrench, color: 'text-muted-foreground' },
    { value: 'jumpstart', label: 'Jump Start', icon: Zap, color: 'text-warning' },
    { value: 'tire_change', label: 'Tire Change', icon: Settings, color: 'text-muted-foreground' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
  ],
  // Default/Other
  other: [
    { value: 'fire_alarm', label: 'Fire Alarm', icon: Flame, color: 'text-destructive' },
    { value: 'security_alarm', label: 'Security Alarm', icon: Shield, color: 'text-warning' },
    { value: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-info' },
    { value: 'electrical', label: 'Electrical', icon: Zap, color: 'text-warning' },
    { value: 'fiber_optic', label: 'Fiber Optic', icon: Cable, color: 'text-success' },
    { value: 'security_cameras', label: 'Security Cameras', icon: Camera, color: 'text-primary' },
    { value: 'dry_wall', label: 'Dry Wall', icon: Square, color: 'text-muted-foreground' },
    { value: 'concrete_service', label: 'Concrete Service', icon: HardHat, color: 'text-accent-foreground' },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-destructive' },
    { value: 'routine', label: 'Routine Check', icon: Clock, color: 'text-muted-foreground' },
  ],
};

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyType, setCompanyType] = useState<string>('other');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [materials, setMaterials] = useState<MaterialAssignmentItem[]>([]);
  
  // Get call types based on company type
  const callTypes = callTypesByBusiness[companyType] || callTypesByBusiness.other;

  // Vessel selection for boat services
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  // Boat-specific fields state (for manual entry if no vessel selected)
  const [boatDetails, setBoatDetails] = useState({
    boat_name: '',
    boat_make: '',
    boat_model: '',
    boat_year: '',
    boat_length: '',
    hull_id: '',
    slip_location: '',
  });

  const [formData, setFormData] = useState({
    client_id: '',
    project_id: '',
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
      // Get user's company first
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (memberData?.company_id) {
        setUserCompanyId(memberData.company_id);
        
        // Fetch company type
        const { data: companyData } = await supabase
          .from('companies')
          .select('type')
          .eq('id', memberData.company_id)
          .single();
        
        if (companyData?.type) {
          setCompanyType(companyData.type);
        }
      }

      const [clientsRes, agentsRes, projectsRes] = await Promise.all([
        supabase.from('clients').select('id, full_name, phone, address').is('deleted_at', null).order('full_name'),
        supabase.from('agents').select('id, full_name, is_available, is_online, phone').order('full_name'),
        supabase.from('projects').select('id, name, status').is('deleted_at', null).neq('status', 'completed').order('name'),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (agentsRes.data) setAgents(agentsRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
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
    
    if (!userCompanyId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Company not loaded. Please refresh and try again.' });
      return;
    }
    
    setSubmitting(true);

    try {
      // Build description with boat details if applicable
      let fullDescription = formData.description || '';
      
      if (companyType === 'boat_services' && (boatDetails.boat_name || boatDetails.hull_id || boatDetails.boat_make)) {
        const boatInfo = [];
        if (boatDetails.boat_name) boatInfo.push(`Boat Name: ${boatDetails.boat_name}`);
        if (boatDetails.hull_id) boatInfo.push(`HIN: ${boatDetails.hull_id}`);
        if (boatDetails.boat_make) boatInfo.push(`Make: ${boatDetails.boat_make}`);
        if (boatDetails.boat_model) boatInfo.push(`Model: ${boatDetails.boat_model}`);
        if (boatDetails.boat_year) boatInfo.push(`Year: ${boatDetails.boat_year}`);
        if (boatDetails.boat_length) boatInfo.push(`Length: ${boatDetails.boat_length}ft`);
        if (boatDetails.slip_location) boatInfo.push(`Location: ${boatDetails.slip_location}`);
        
        const boatSection = `\n\n--- Vessel Information ---\n${boatInfo.join('\n')}`;
        fullDescription = fullDescription + boatSection;
      }

      const { data: ticketData, error } = await supabase.from('tickets').insert({
        client_id: formData.client_id,
        project_id: formData.project_id,
        title: formData.title,
        description: fullDescription,
        call_type: formData.call_type,
        priority: formData.priority,
        assigned_agent_id: formData.assigned_agent_id || null,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        status: formData.assigned_agent_id ? 'assigned' : 'pending',
        call_started_at: new Date().toISOString(),
        created_by: user?.id,
        company_id: userCompanyId,
        admin_approval_status: 'approved',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: user?.id,
        vessel_id: selectedVesselId || null,
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
                <Label>Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
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

        {/* Vessel Selection - Only shown for boat_services companies */}
        {companyType === 'boat_services' && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Ship className="h-5 w-5 text-info" />
                Vessel Information
              </CardTitle>
              <CardDescription>Select a registered vessel or enter details manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vessel Selector - only show if client is selected */}
              {formData.client_id && (
                <VesselSelector
                  clientId={formData.client_id}
                  value={selectedVesselId || undefined}
                  onValueChange={(vesselId) => {
                    setSelectedVesselId(vesselId === 'none' ? null : vesselId);
                    // Clear manual boat details when vessel is selected
                    if (vesselId && vesselId !== 'none') {
                      setBoatDetails({
                        boat_name: '',
                        boat_make: '',
                        boat_model: '',
                        boat_year: '',
                        boat_length: '',
                        hull_id: '',
                        slip_location: '',
                      });
                    }
                  }}
                />
              )}

              {!formData.client_id && (
                <p className="text-sm text-muted-foreground">Select a client first to choose from their registered vessels.</p>
              )}

              {/* Manual entry - only show if no vessel selected */}
              {!selectedVesselId && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or enter manually
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="boat_name">Boat Name</Label>
                      <Input
                        id="boat_name"
                        value={boatDetails.boat_name}
                        onChange={(e) => setBoatDetails({ ...boatDetails, boat_name: e.target.value })}
                        placeholder="e.g., Sea Breeze"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hull_id">Hull ID (HIN)</Label>
                      <Input
                        id="hull_id"
                        value={boatDetails.hull_id}
                        onChange={(e) => setBoatDetails({ ...boatDetails, hull_id: e.target.value })}
                        placeholder="e.g., ABC12345D678"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="boat_make">Make</Label>
                      <Input
                        id="boat_make"
                        value={boatDetails.boat_make}
                        onChange={(e) => setBoatDetails({ ...boatDetails, boat_make: e.target.value })}
                        placeholder="e.g., Boston Whaler"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="boat_model">Model</Label>
                      <Input
                        id="boat_model"
                        value={boatDetails.boat_model}
                        onChange={(e) => setBoatDetails({ ...boatDetails, boat_model: e.target.value })}
                        placeholder="e.g., Outrage 280"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="boat_year">Year</Label>
                      <Input
                        id="boat_year"
                        value={boatDetails.boat_year}
                        onChange={(e) => setBoatDetails({ ...boatDetails, boat_year: e.target.value })}
                        placeholder="e.g., 2022"
                        type="number"
                        min="1900"
                        max="2030"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="boat_length">Length (ft)</Label>
                      <Input
                        id="boat_length"
                        value={boatDetails.boat_length}
                        onChange={(e) => setBoatDetails({ ...boatDetails, boat_length: e.target.value })}
                        placeholder="e.g., 28"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slip_location">Slip/Dock Location</Label>
                      <Input
                        id="slip_location"
                        value={boatDetails.slip_location}
                        onChange={(e) => setBoatDetails({ ...boatDetails, slip_location: e.target.value })}
                        placeholder="e.g., Marina Bay, Slip #42"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

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
          <Button type="submit" disabled={submitting || !formData.client_id || !formData.project_id || !formData.title}>
            {submitting ? 'Creating...' : 'Create Call'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewCallPage;