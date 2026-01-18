import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, Users, Ticket, TrendingUp, Clock, CheckCircle2, HardHat, FolderOpen,
  DollarSign, AlertTriangle, FileText, Plus, ArrowRight, Receipt, ClipboardList,
  Building2, Wrench, Package, Bell, ChevronRight, AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';
import { PendingPartnerships } from '@/components/PendingPartnerships';
import { PendingProjectInvitations } from '@/components/PendingProjectInvitations';
import { ClientRequestApprovals } from '@/components/ClientRequestApprovals';
import { CompleteProfileBanner } from '@/components/CompleteProfileBanner';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeProjects: number;
  completedProjects: number;
  openTickets: number;
  pendingApprovals: number;
  totalClients: number;
  totalEmployees: number;
}

interface ActionItem {
  id: string;
  type: 'overdue_invoice' | 'expiring_permit' | 'pending_approval' | 'equipment_maintenance' | 'low_inventory';
  title: string;
  description: string;
  dueDate?: string;
  amount?: number;
  urgency: 'high' | 'medium' | 'low';
  link: string;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: 'project' | 'invoice' | 'ticket' | 'client' | 'payment';
}

interface ProjectStatus {
  status: string;
  count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--muted))'];

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { effectiveCompanyId, isPlatformView } = useEffectiveCompanyId();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    activeProjects: 0,
    completedProjects: 0,
    openTickets: 0,
    pendingApprovals: 0,
    totalClients: 0,
    totalEmployees: 0,
  });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<ProjectStatus[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Dashboard] effectiveCompanyId changed:', effectiveCompanyId, 'isPlatformView:', isPlatformView);
    fetchDashboardData();
  }, [effectiveCompanyId]);

  const fetchDashboardData = async () => {
    try {
      console.log('[Dashboard] Fetching data with effectiveCompanyId:', effectiveCompanyId);
      setLoading(true);
      const today = new Date();
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

      // Build queries with optional company filter
      const invoicesQuery = supabase.from('client_invoices').select('id, amount, status, due_date, paid_at');
      const projectsQuery = supabase.from('projects').select('id, status, name').is('deleted_at', null);
      const ticketCountQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null);
      const pendingTicketCountQuery = supabase.from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending');
      const clientCountQuery = supabase.from('clients').select('*', { count: 'exact', head: true }).is('deleted_at', null);
      const bidsQuery = supabase.from('bids').select('id, internal_approval_status, client_approval_status');
      const changeOrdersQuery = supabase.from('change_orders').select('id, status');
      const permitsQuery = supabase.from('permits').select('id, expiration_date, status');
      const equipmentQuery = supabase.from('equipment').select('id, next_service_date, status');
      const recentProjectsQuery = supabase.from('projects').select('id, name, status, updated_at').is('deleted_at', null).order('updated_at', { ascending: false }).limit(5);
      const recentInvoicesQuery = supabase.from('client_invoices').select('id, invoice_number, amount, status, created_at, clients(full_name)').order('created_at', { ascending: false }).limit(5);
      const recentTicketsQuery = supabase.from('tickets').select('id, title, status, created_at, clients(full_name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(5);
      const employeeCountQuery = supabase.from('company_members').select('*', { count: 'exact', head: true });

      // Apply company filter if not in platform view
      if (effectiveCompanyId) {
        invoicesQuery.eq('company_id', effectiveCompanyId);
        projectsQuery.eq('company_id', effectiveCompanyId);
        ticketCountQuery.eq('company_id', effectiveCompanyId);
        pendingTicketCountQuery.eq('company_id', effectiveCompanyId);
        clientCountQuery.eq('company_id', effectiveCompanyId);
        bidsQuery.eq('company_id', effectiveCompanyId);
        changeOrdersQuery.eq('company_id', effectiveCompanyId);
        permitsQuery.eq('company_id', effectiveCompanyId);
        equipmentQuery.eq('company_id', effectiveCompanyId);
        recentProjectsQuery.eq('company_id', effectiveCompanyId);
        recentInvoicesQuery.eq('company_id', effectiveCompanyId);
        recentTicketsQuery.eq('company_id', effectiveCompanyId);
        employeeCountQuery.eq('company_id', effectiveCompanyId);
      }

      // Fetch all data in parallel
      const [
        { data: invoices },
        { data: projects },
        { count: ticketCount },
        { count: pendingTicketCount },
        { count: clientCount },
        { data: bids },
        { data: changeOrders },
        { data: permits },
        { data: equipment },
        { data: recentProjects },
        { data: recentInvoices },
        { data: recentTickets },
        { count: employeeCount },
      ] = await Promise.all([
        invoicesQuery,
        projectsQuery,
        ticketCountQuery,
        pendingTicketCountQuery,
        clientCountQuery,
        bidsQuery,
        changeOrdersQuery,
        permitsQuery,
        equipmentQuery,
        recentProjectsQuery,
        recentInvoicesQuery,
        recentTicketsQuery,
        employeeCountQuery,
      ]);

      // Calculate stats
      const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
      const pendingInvoicesList = invoices?.filter(i => i.status === 'pending' || i.status === 'sent') || [];
      const overdueInvoicesList = invoices?.filter(i => {
        if (i.status === 'paid') return false;
        return i.due_date && new Date(i.due_date) < today;
      }) || [];

      const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
      const pendingAmount = pendingInvoicesList.reduce((sum, i) => sum + (i.amount || 0), 0);
      const overdueAmount = overdueInvoicesList.reduce((sum, i) => sum + (i.amount || 0), 0);

      const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;

      // Count pending approvals
      const pendingBids = bids?.filter(b => b.internal_approval_status === 'pending' || b.client_approval_status === 'pending').length || 0;
      const pendingChangeOrders = changeOrders?.filter(co => co.status === 'pending').length || 0;
      const totalPendingApprovals = pendingBids + pendingChangeOrders;

      setStats({
        totalRevenue,
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingAmount,
        overdueInvoices: overdueAmount,
        activeProjects,
        completedProjects,
        openTickets: pendingTicketCount || 0,
        pendingApprovals: totalPendingApprovals,
        totalClients: clientCount || 0,
        totalEmployees: employeeCount || 0,
      });

      // Build action items
      const actions: ActionItem[] = [];

      // Overdue invoices
      overdueInvoicesList.slice(0, 3).forEach(inv => {
        actions.push({
          id: inv.id,
          type: 'overdue_invoice',
          title: 'Overdue Invoice',
          description: `$${inv.amount?.toLocaleString()} overdue`,
          dueDate: inv.due_date,
          amount: inv.amount,
          urgency: 'high',
          link: '/admin/billing',
        });
      });

      // Expiring permits
      permits?.filter(p => {
        if (!p.expiration_date || p.status === 'expired') return false;
        const daysUntil = differenceInDays(parseISO(p.expiration_date), today);
        return daysUntil <= 30 && daysUntil >= 0;
      }).slice(0, 3).forEach(permit => {
        const daysUntil = differenceInDays(parseISO(permit.expiration_date!), today);
        actions.push({
          id: permit.id,
          type: 'expiring_permit',
          title: 'Permit Expiring',
          description: `Expires in ${daysUntil} days`,
          dueDate: permit.expiration_date!,
          urgency: daysUntil <= 7 ? 'high' : 'medium',
          link: '/admin/permits',
        });
      });

      // Equipment maintenance due
      equipment?.filter(eq => {
        if (!eq.next_service_date) return false;
        const daysUntil = differenceInDays(parseISO(eq.next_service_date), today);
        return daysUntil <= 14 && daysUntil >= -7;
      }).slice(0, 3).forEach(eq => {
        const daysUntil = differenceInDays(parseISO(eq.next_service_date!), today);
        actions.push({
          id: eq.id,
          type: 'equipment_maintenance',
          title: 'Maintenance Due',
          description: daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `Due in ${daysUntil} days`,
          dueDate: eq.next_service_date!,
          urgency: daysUntil <= 0 ? 'high' : 'medium',
          link: '/admin/equipment',
        });
      });

      setActionItems(actions.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }));

      // Build recent activity
      const activity: RecentActivity[] = [];

      recentProjects?.forEach(p => {
        activity.push({
          id: p.id,
          type: 'project',
          title: p.name,
          description: `Status: ${p.status}`,
          timestamp: p.updated_at,
          icon: 'project',
        });
      });

      recentInvoices?.forEach((inv: any) => {
        activity.push({
          id: inv.id,
          type: 'invoice',
          title: `Invoice #${inv.invoice_number}`,
          description: `$${inv.amount?.toLocaleString()} - ${inv.clients?.full_name || 'Unknown'}`,
          timestamp: inv.created_at,
          icon: 'invoice',
        });
      });

      recentTickets?.forEach((t: any) => {
        activity.push({
          id: t.id,
          type: 'ticket',
          title: t.title,
          description: t.clients?.full_name || 'Unknown client',
          timestamp: t.created_at,
          icon: 'ticket',
        });
      });

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 8));

      // Project status distribution
      const statusCounts: Record<string, number> = {};
      projects?.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      setProjectStatusData(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

      // Calculate monthly revenue from real invoice data (last 6 months)
      const monthlyRevenueData: { month: string; revenue: number }[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = format(monthDate, 'MMM');
        const monthStart = format(monthDate, 'yyyy-MM-dd');
        const monthEndDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEndStr = format(monthEndDate, 'yyyy-MM-dd');
        
        // Calculate revenue for this month from paid invoices
        const monthRevenue = invoices?.filter(inv => {
          if (inv.status !== 'paid' || !inv.paid_at) return false;
          const paidDate = inv.paid_at.split('T')[0];
          return paidDate >= monthStart && paidDate <= monthEndStr;
        }).reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
        
        monthlyRevenueData.push({ month: monthName, revenue: monthRevenue });
      }
      
      setMonthlyRevenue(monthlyRevenueData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'project': return <FolderOpen className="h-4 w-4" />;
      case 'invoice': return <Receipt className="h-4 w-4" />;
      case 'ticket': return <Ticket className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-info/10 text-info border-info/20';
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
    <div className="space-y-6 animate-fade-in">
      {/* Complete Profile Banner */}
      <CompleteProfileBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.welcome')}! {t('dashboard.overview')}.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/projects')} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {t('dashboard.newProject')}
          </Button>
          <Button onClick={() => navigate('/admin/billing')} variant="outline" size="sm">
            <Receipt className="h-4 w-4 mr-1" /> {t('invoices.newInvoice')}
          </Button>
        </div>
      </div>

      {/* Pending Invitations & Approvals */}
      <PendingProjectInvitations />
      <PendingPartnerships />
      <ClientRequestApprovals />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/billing')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {t('dashboard.totalRevenue')}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-3">${stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.paidRevenue')}</p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-warning">${stats.pendingInvoices.toLocaleString()} {t('common.pending').toLowerCase()}</span>
              {stats.overdueInvoices > 0 && (
                <span className="text-destructive">${stats.overdueInvoices.toLocaleString()} {t('invoices.overdue').toLowerCase()}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/projects')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {t('projects.title')}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.activeProjects}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.activeProjects')}</p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-success">{stats.completedProjects} {t('common.completed').toLowerCase()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/tickets')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-warning" />
              </div>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {t('tickets.title')}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.openTickets}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.openTickets')}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/bids')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-info" />
              </div>
              <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                {t('dashboard.pendingApprovals')}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.pendingApprovals}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.pendingApprovals')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{stats.totalClients}</p>
              <p className="text-xs text-muted-foreground">{t('clients.title')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{stats.totalEmployees}</p>
              <p className="text-xs text-muted-foreground">{t('employees.title')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{stats.paidInvoices}</p>
              <p className="text-xs text-muted-foreground">{t('invoices.paid')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{stats.completedProjects}</p>
              <p className="text-xs text-muted-foreground">{t('common.completed')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Section */}
      {actionItems.length > 0 && (
        <Card className="border-0 shadow-md border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('dashboard.actionRequired')}
            </CardTitle>
            <CardDescription>{t('dashboard.actionRequired')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getUrgencyColor(item.urgency)}`}
                  onClick={() => navigate(item.link)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{item.urgency}</Badge>
                  </div>
                  <p className="text-sm mt-1 opacity-80">{item.description}</p>
                  {item.dueDate && (
                    <p className="text-xs mt-1 opacity-60">
                      {format(parseISO(item.dueDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">{t('dashboard.revenueTrend')}</CardTitle>
            <CardDescription>{t('dashboard.revenueTrend')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Status Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">{t('dashboard.projectStatus')}</CardTitle>
            <CardDescription>{t('dashboard.projectStatus')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {projectStatusData.map((entry, index) => (
                <Badge key={entry.status} variant="outline" className="capitalize">
                  <span
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {entry.status}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display">{t('dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('dashboard.recentActivity')}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            {t('common.viewAll')} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Clients', icon: Users, path: '/admin/clients' },
          { label: 'Employees', icon: HardHat, path: '/admin/employees' },
          { label: 'Equipment', icon: Wrench, path: '/admin/equipment' },
          { label: 'Inventory', icon: Package, path: '/admin/inventory' },
          { label: 'Calendar', icon: Calendar, path: '/admin/calendar' },
          { label: 'Reports', icon: TrendingUp, path: '/admin/employee-time-reports' },
        ].map((link) => (
          <Button
            key={link.path}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate(link.path)}
          >
            <link.icon className="h-5 w-5" />
            <span className="text-xs">{link.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
