import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Ship, 
  ArrowLeft, 
  Anchor, 
  MapPin, 
  Calendar,
  Wrench,
  FileText,
  Clock,
  User,
  DollarSign,
  Image,
  Loader2,
  Fuel,
  Settings,
  Ruler,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { VesselPhotoUpload } from '@/components/VesselPhotoUpload';

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
  created_at: string;
  updated_at: string;
  client_id: string;
  company_id: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  call_type: string | null;
  scheduled_date: string;
  created_at: string;
  total_time_minutes: number | null;
  project: { name: string } | null;
  assigned_agent: { full_name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  paid_at: string | null;
}

const VesselDetailPage = () => {
  const { vesselId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch vessel details
  const { data: vessel, isLoading: loadingVessel } = useQuery({
    queryKey: ['vessel-detail', vesselId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', vesselId)
        .single();
      if (error) throw error;
      return data as Vessel;
    },
    enabled: !!vesselId,
  });

  // Fetch client info
  const { data: client } = useQuery({
    queryKey: ['vessel-client', vessel?.client_id],
    queryFn: async () => {
      if (!vessel?.client_id) return null;
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .eq('id', vessel.client_id)
        .single();
      return data as Client | null;
    },
    enabled: !!vessel?.client_id,
  });

  // Fetch service history (tickets directly linked to this vessel)
  const { data: serviceHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['vessel-service-history', vesselId],
    queryFn: async () => {
      if (!vesselId) return [];
      
      // First get tickets directly linked to this vessel
      const { data: directTickets } = await supabase
        .from('tickets')
        .select(`
          id, title, description, status, priority, call_type, 
          scheduled_date, created_at, total_time_minutes,
          project:projects(name),
          assigned_agent:agents(full_name)
        `)
        .eq('vessel_id', vesselId)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false });

      // Also get legacy tickets that mention this vessel in description (for backwards compatibility)
      if (vessel) {
        const { data: legacyData } = await supabase
          .from('tickets')
          .select(`
            id, title, description, status, priority, call_type, 
            scheduled_date, created_at, total_time_minutes,
            project:projects(name),
            assigned_agent:agents(full_name)
          `)
          .eq('client_id', vessel.client_id)
          .is('vessel_id', null)
          .is('deleted_at', null)
          .order('scheduled_date', { ascending: false });
        
        // Filter legacy tickets that mention this vessel
        const legacyFiltered = (legacyData || []).filter(ticket => {
          const desc = ticket.description?.toLowerCase() || '';
          const boatName = vessel.boat_name?.toLowerCase() || '';
          const hullId = vessel.hull_id?.toLowerCase() || '';
          
          return desc.includes(boatName) || 
                 (hullId && desc.includes(hullId)) ||
                 desc.includes('vessel information');
        });
        
        // Combine and deduplicate
        const directIds = new Set((directTickets || []).map(t => t.id));
        const combined = [
          ...(directTickets || []),
          ...legacyFiltered.filter(t => !directIds.has(t.id))
        ];
        
        return combined as Ticket[];
      }

      return (directTickets || []) as Ticket[];
    },
    enabled: !!vesselId,
  });

  // Fetch invoices for this vessel
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['vessel-invoices', vesselId],
    queryFn: async () => {
      if (!vessel) return [];
      
      // For now, get invoices linked to this client
      // In a future update, we could add a vessel_id column to invoices
      const { data } = await supabase
        .from('client_invoices')
        .select('id, invoice_number, amount, status, due_date, created_at, paid_at')
        .eq('client_id', vessel.client_id)
        .order('created_at', { ascending: false })
        .limit(20);

      return (data || []) as Invoice[];
    },
    enabled: !!vessel,
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'in_progress': case 'working': return 'bg-info/10 text-info';
      case 'assigned': case 'en_route': return 'bg-warning/10 text-warning';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-warning/10 text-warning';
      case 'normal': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/10 text-success';
      case 'sent': return 'bg-info/10 text-info';
      case 'overdue': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loadingVessel) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="text-center py-12">
        <Ship className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-semibold mb-2">Vessel Not Found</h2>
        <p className="text-muted-foreground mb-4">The vessel you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/admin/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const totalServiceCalls = serviceHistory?.length || 0;
  const totalTimeHours = Math.round((serviceHistory?.reduce((sum, t) => sum + (t.total_time_minutes || 0), 0) || 0) / 60);
  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.amount / 100), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Ship className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold">{vessel.boat_name}</h1>
              <p className="text-muted-foreground">
                {[vessel.year, vessel.make, vessel.model].filter(Boolean).join(' ') || 'Vessel Details'}
              </p>
            </div>
          </div>
        </div>
        {client && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Owner</p>
            <p className="font-medium">{client.full_name}</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalServiceCalls}</p>
                <p className="text-xs text-muted-foreground">Service Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTimeHours}h</p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalInvoiced.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {vessel.created_at ? format(new Date(vessel.created_at), 'MMM yyyy') : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="photos">Vessel Images</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Anchor className="h-5 w-5" />
                  Vessel Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Ship className="h-4 w-4" /> Boat Name
                    </p>
                    <p className="font-medium">{vessel.boat_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Hash className="h-4 w-4" /> Hull ID (HIN)
                    </p>
                    <p className="font-medium">{vessel.hull_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Make</p>
                    <p className="font-medium">{vessel.make || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{vessel.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Year
                    </p>
                    <p className="font-medium">{vessel.year || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Ruler className="h-4 w-4" /> Length
                    </p>
                    <p className="font-medium">{vessel.length || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Settings className="h-4 w-4" /> Engine Type
                    </p>
                    <p className="font-medium">{vessel.engine_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Fuel className="h-4 w-4" /> Fuel Type
                    </p>
                    <p className="font-medium">{vessel.fuel_type || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Slip/Dock Location
                    </p>
                    <p className="font-medium">{vessel.slip_location || '-'}</p>
                  </div>
                </div>
                {vessel.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{vessel.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {client && (
              <Card className="border-0 shadow-md md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{client.full_name}</p>
                      <p className="text-muted-foreground">{client.email}</p>
                      {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/admin/clients">View Client</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Service History Tab */}
        <TabsContent value="history">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
              </CardTitle>
              <CardDescription>
                All service calls and work performed on this vessel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : serviceHistory && serviceHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceHistory.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          {format(new Date(ticket.scheduled_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.title}</p>
                            {ticket.project && (
                              <p className="text-xs text-muted-foreground">
                                {ticket.project.name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.call_type && (
                            <Badge variant="outline" className="capitalize">
                              {ticket.call_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_agent?.full_name || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.total_time_minutes 
                            ? `${Math.round(ticket.total_time_minutes / 60)}h ${ticket.total_time_minutes % 60}m`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No service history found for this vessel.</p>
                  <p className="text-sm">Service calls will appear here when they're linked to this vessel.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                Invoices for this client (filtered by vessel where applicable)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getInvoiceStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(invoice.amount / 100).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Vessel Images
              </CardTitle>
              <CardDescription>
                Photos and documentation for this vessel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VesselPhotoUpload 
                vesselId={vessel.id} 
                companyId={vessel.company_id} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VesselDetailPage;
