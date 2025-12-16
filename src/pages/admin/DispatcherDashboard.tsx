import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LiveAgentMap } from '@/components/LiveAgentMap';
import { 
  MapPin, 
  Users, 
  Ticket, 
  Bell, 
  Clock, 
  Search,
  Phone,
  Navigation,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  ShoppingCart
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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
}

interface JobUpdate {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  tickets: { title: string; id: string } | null;
  agents: { full_name: string } | null;
}

interface ActiveCall {
  id: string;
  title: string;
  status: string;
  call_type: string | null;
  call_started_at: string | null;
  scheduled_date: string;
  scheduled_time: string;
  clients: { full_name: string } | null;
  agents: { full_name: string; is_online: boolean } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  assigned: { label: 'Assigned', color: 'bg-info/10 text-info', icon: Bell },
  en_route: { label: 'En Route', color: 'bg-warning/10 text-warning', icon: Truck },
  on_site: { label: 'On Site', color: 'bg-primary/10 text-primary', icon: MapPin },
  working: { label: 'Working', color: 'bg-secondary/20 text-secondary-foreground', icon: Wrench },
  completed: { label: 'Completed', color: 'bg-success/10 text-success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const DispatcherDashboard = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<JobUpdate[]>([]);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Get user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company-dashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ["low-stock-dashboard", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity_in_stock, minimum_stock, unit")
        .eq("company_id", userCompany.company_id)
        .not("minimum_stock", "is", null);
      if (error) throw error;
      return data.filter(item => item.minimum_stock && item.quantity_in_stock <= item.minimum_stock);
    },
    enabled: !!userCompany?.company_id,
  });

  // Fetch pending purchase orders
  const { data: pendingOrders } = useQuery({
    queryKey: ["pending-orders-dashboard", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, order_number, supplier, status, total_cost, created_at")
        .eq("company_id", userCompany.company_id)
        .in("status", ["draft", "submitted", "ordered", "shipped"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
  });

  useEffect(() => {
    fetchDashboardData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [agentsRes, updatesRes, callsRes] = await Promise.all([
        supabase
          .from('agents')
          .select('*')
          .order('is_online', { ascending: false }),
        supabase
          .from('job_updates')
          .select('*, tickets(title, id), agents(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('tickets')
          .select('*, clients(full_name), agents(full_name, is_online)')
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (updatesRes.data) setRecentUpdates(updatesRes.data as JobUpdate[]);
      if (callsRes.data) setActiveCalls(callsRes.data as ActiveCall[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const updatesChannel = supabase
      .channel('job-updates-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_updates' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const agentsChannel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agents' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(updatesChannel);
      supabase.removeChannel(agentsChannel);
    };
  };

  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineAgents = agents.filter(a => a.is_online).length;
  const availableAgents = agents.filter(a => a.is_available && a.is_online).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dispatcher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor agents and active calls in real-time.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents, calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineAgents}</p>
                <p className="text-xs text-muted-foreground">Online Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableAgents}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCalls.length}</p>
                <p className="text-xs text-muted-foreground">Active Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentUpdates.length}</p>
                <p className="text-xs text-muted-foreground">Recent Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Agent Map */}
      <LiveAgentMap companyId={userCompany?.company_id || null} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agents Panel */}
        <Card className="border-0 shadow-md lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Field Agents ({agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredAgents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No agents found.</p>
            ) : (
              filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-medium text-sm">{agent.full_name.charAt(0)}</span>
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                        agent.is_online ? "bg-success" : "bg-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{agent.full_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.is_available ? "default" : "secondary"} className="text-xs">
                        {agent.is_available ? 'Available' : 'Busy'}
                      </Badge>
                      {agent.last_location_update && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistanceToNow(new Date(agent.last_location_update), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {agent.phone && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Calls */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Active Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {activeCalls.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active calls at the moment.</p>
            ) : (
              activeCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{call.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {call.call_type || 'General'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{call.clients?.full_name}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(call.scheduled_date), 'MMM d')} at {call.scheduled_time}
                      </span>
                      {call.agents && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {call.agents.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={cn("capitalize", statusConfig[call.status]?.color || 'bg-muted')}>
                    {statusConfig[call.status]?.label || call.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Updates Feed */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Live Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUpdates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No updates yet. Updates will appear here in real-time.</p>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((update) => {
                const config = statusConfig[update.status];
                const StatusIcon = config?.icon || Bell;
                
                return (
                  <div
                    key={update.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 animate-slide-up"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config?.color || 'bg-muted')}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{update.agents?.full_name}</span>
                        {' updated '}
                        <span className="font-medium">{update.tickets?.title}</span>
                        {' to '}
                        <Badge variant="outline" className="text-xs ml-1">
                          {config?.label || update.status}
                        </Badge>
                      </p>
                      {update.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{update.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Alerts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Alerts
                {lowStockItems && lowStockItems.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{lowStockItems.length}</Badge>
                )}
              </CardTitle>
              <Link to="/admin/inventory">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!lowStockItems || lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">All items are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity_in_stock} {item.unit} remaining (min: {item.minimum_stock})
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Low</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Purchase Orders */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-warning" />
                Pending Orders
                {pendingOrders && pendingOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingOrders.length}</Badge>
                )}
              </CardTitle>
              <Link to="/admin/inventory/orders">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!pendingOrders || pendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No pending orders</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {pendingOrders.map((order) => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-muted text-muted-foreground',
                    submitted: 'bg-info/10 text-info',
                    ordered: 'bg-warning/10 text-warning',
                    shipped: 'bg-primary/10 text-primary',
                  };
                  
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.supplier || 'No supplier'} • ${order.total_cost?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("capitalize", statusColors[order.status] || 'bg-muted')}>
                        {order.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DispatcherDashboard;