import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Ticket, TrendingUp, Clock, CheckCircle2, HardHat, FolderOpen } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';

interface Stats {
  totalClients: number;
  totalTickets: number;
  pendingTickets: number;
  completedTickets: number;
  todayTickets: number;
  monthlyTickets: number;
}

interface RecentTicket {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  clients: { full_name: string } | null;
}

interface AgentProjectAssignment {
  id: string;
  agent: { id: string; full_name: string } | null;
  project: { id: string; name: string; status: string } | null;
  role: string | null;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalTickets: 0,
    pendingTickets: 0,
    completedTickets: 0,
    todayTickets: 0,
    monthlyTickets: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [agentAssignments, setAgentAssignments] = useState<AgentProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [
        { count: clientCount },
        { count: ticketCount },
        { count: pendingCount },
        { count: completedCount },
        { count: todayCount },
        { count: monthlyCount },
        { data: tickets },
        { data: assignments },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('scheduled_date', monthStart).lte('scheduled_date', monthEnd),
        supabase.from('tickets').select('*, clients(full_name)').order('scheduled_date', { ascending: false }).limit(5),
        supabase.from('project_agents').select('id, role, agent:agents(id, full_name), project:projects(id, name, status)').order('assigned_at', { ascending: false }),
      ]);

      setStats({
        totalClients: clientCount || 0,
        totalTickets: ticketCount || 0,
        pendingTickets: pendingCount || 0,
        completedTickets: completedCount || 0,
        todayTickets: todayCount || 0,
        monthlyTickets: monthlyCount || 0,
      });

      setRecentTickets(tickets || []);
      setAgentAssignments((assignments as AgentProjectAssignment[]) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Clients', value: stats.totalClients, icon: Users, color: 'bg-info/10 text-info' },
    { title: 'Total Tickets', value: stats.totalTickets, icon: Ticket, color: 'bg-primary/10 text-primary' },
    { title: 'Today\'s Tickets', value: stats.todayTickets, icon: Calendar, color: 'bg-secondary/20 text-secondary-foreground' },
    { title: 'This Month', value: stats.monthlyTickets, icon: TrendingUp, color: 'bg-success/10 text-success' },
    { title: 'Pending', value: stats.pendingTickets, icon: Clock, color: 'bg-warning/10 text-warning' },
    { title: 'Completed', value: stats.completedTickets, icon: CheckCircle2, color: 'bg-success/10 text-success' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/10 text-success';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'completed': return 'bg-info/10 text-info';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="animate-slide-up border-0 shadow-md hover:shadow-lg transition-shadow"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Project Assignments */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              Agents on Projects
            </CardTitle>
            <CardDescription>Which agents are working on which projects</CardDescription>
          </CardHeader>
          <CardContent>
            {agentAssignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No agents assigned to projects yet.</p>
            ) : (
              <div className="space-y-3">
                {agentAssignments.map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{assignment.agent?.full_name || 'Unknown Agent'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate">{assignment.project?.name || 'Unknown Project'}</span>
                        {assignment.role && (
                          <span className="px-1.5 py-0.5 rounded bg-secondary/50 text-xs capitalize">{assignment.role}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      assignment.project?.status === 'active' ? 'bg-success/10 text-success' :
                      assignment.project?.status === 'completed' ? 'bg-info/10 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {assignment.project?.status || 'unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Recent Tickets</CardTitle>
            <CardDescription>Latest appointments and bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tickets yet. Create your first ticket!</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.clients?.full_name} • {format(new Date(ticket.scheduled_date), 'MMM d, yyyy')} at {ticket.scheduled_time}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
