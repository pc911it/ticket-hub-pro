import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectAttachments } from '@/components/ProjectAttachments';
import { ProjectMilestones } from '@/components/ProjectMilestones';
import { ProjectActivityTimeline } from '@/components/ProjectActivityTimeline';
import { CompanyPartnerships } from '@/components/CompanyPartnerships';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Building2, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Ticket,
  User,
  MessageCircle,
  Users,
  FileText
} from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  clients: { full_name: string } | null;
}

interface ProjectTicket {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  scheduled_date: string;
  scheduled_time: string;
  clients: { full_name: string } | null;
  agents: { full_name: string } | null;
}

const ProjectDashboardPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<ProjectTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    const [{ data: projectData }, { data: ticketsData }] = await Promise.all([
      supabase
        .from('projects')
        .select('*, clients(full_name)')
        .eq('id', projectId)
        .single(),
      supabase
        .from('tickets')
        .select('id, title, status, priority, scheduled_date, scheduled_time, clients(full_name), agents:assigned_agent_id(full_name)')
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: true }),
    ]);

    if (projectData) setProject(projectData);
    if (ticketsData) setTickets(ticketsData as ProjectTicket[]);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/30';
      case 'completed': return 'bg-info/10 text-info border-info/30';
      case 'on-hold': return 'bg-warning/10 text-warning border-warning/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTicketStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/30';
      case 'in_progress': return 'bg-info/10 text-info border-info/30';
      case 'pending': return 'bg-warning/10 text-warning border-warning/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'high': return 'bg-warning/10 text-warning border-warning/30';
      case 'normal': return 'bg-muted text-muted-foreground';
      case 'low': return 'bg-info/10 text-info border-info/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateProgress = () => {
    if (!project?.start_date || !project?.end_date) return null;
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();
    
    if (isBefore(today, start)) return 0;
    if (isAfter(today, end)) return 100;
    
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(today, start);
    
    return Math.round((elapsedDays / totalDays) * 100);
  };

  const getTimelineInfo = () => {
    if (!project?.start_date || !project?.end_date) return null;
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();
    
    const totalDays = differenceInDays(end, start);
    const daysRemaining = differenceInDays(end, today);
    
    return { totalDays, daysRemaining };
  };

  const ticketStats = {
    total: tickets.length,
    completed: tickets.filter(t => t.status === 'completed').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
  };

  const ticketCompletionRate = ticketStats.total > 0 
    ? Math.round((ticketStats.completed / ticketStats.total) * 100) 
    : 0;

  const progress = calculateProgress();
  const timelineInfo = getTimelineInfo();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild variant="outline">
          <Link to="/admin/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link to="/admin/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {project.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-sm", getStatusColor(project.status))}>
                {project.status}
              </Badge>
              {project.clients && (
                <span className="text-muted-foreground text-sm">
                  Client: {project.clients.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
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
                <p className="text-2xl font-bold">{ticketStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline Progress */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Timeline Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress !== null ? (
              <>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {format(new Date(project.start_date!), 'MMM d, yyyy')}
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(project.end_date!), 'MMM d, yyyy')}
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{progress}% Complete</span>
                  {timelineInfo && (
                    <span className={cn(
                      "text-sm",
                      timelineInfo.daysRemaining < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {timelineInfo.daysRemaining < 0 
                        ? `${Math.abs(timelineInfo.daysRemaining)} days overdue`
                        : `${timelineInfo.daysRemaining} days remaining`
                      }
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Set start and end dates to track timeline progress.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ticket Completion */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Ticket Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketStats.total > 0 ? (
              <>
                <Progress value={ticketCompletionRate} className="h-3" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{ticketCompletionRate}% Complete</span>
                  <span className="text-sm text-muted-foreground">
                    {ticketStats.completed} of {ticketStats.total} tickets
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No tickets assigned to this project yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="partners" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Partners</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Tickets</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Milestones and Activity Timeline */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <ProjectMilestones 
                  projectId={project.id} 
                  projectStartDate={project.start_date}
                  projectEndDate={project.end_date}
                />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <ProjectActivityTimeline 
                  projectId={project.id} 
                  projectStartDate={project.start_date}
                />
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{project.address}</p>
                  </div>
                </div>
              )}
              {project.budget && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Budget</p>
                    <p className="text-sm text-muted-foreground">
                      ${project.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {project.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              )}
              {project.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{project.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectAttachments projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>


        {/* Partners Tab */}
        <TabsContent value="partners">
          <CompanyPartnerships projectId={project.id} projectName={project.name} />
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  Project Tickets
                </CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/tickets">View All Tickets</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No tickets assigned to this project.
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Assign tickets to this project from the Tickets page.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ticket.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ticket.scheduled_date), 'MMM d, yyyy')}
                          </span>
                          {ticket.agents && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.agents.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(ticket.priority))}
                        >
                          {ticket.priority || 'normal'}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getTicketStatusColor(ticket.status))}
                        >
                          {ticket.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDashboardPage;
