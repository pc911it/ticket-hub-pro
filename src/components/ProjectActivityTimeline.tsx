import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  MapPin, 
  Wrench,
  Flag,
  FileText,
  User,
  Calendar,
  AlertCircle,
  CircleDot,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActivityItem {
  id: string;
  type: 'job_update' | 'milestone' | 'ticket_created' | 'ticket_completed';
  title: string;
  description: string | null;
  timestamp: string;
  agent?: string;
  status?: string;
}

interface TicketSummary {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  agent: string | null;
  description: string | null;
  scheduledDate: string;
}

interface ProjectActivityTimelineProps {
  projectId: string;
  projectStartDate?: string | null;
}

export const ProjectActivityTimeline = ({ projectId, projectStartDate }: ProjectActivityTimelineProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [completedTickets, setCompletedTickets] = useState<TicketSummary[]>([]);
  const [pendingTickets, setPendingTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    // Fetch job updates for tickets in this project
    const { data: jobUpdates } = await supabase
      .from('job_updates')
      .select(`
        id,
        status,
        notes,
        created_at,
        agents(full_name),
        tickets!inner(id, title, project_id)
      `)
      .eq('tickets.project_id', projectId)
      .order('created_at', { ascending: false });

    // Fetch milestones for this project
    const { data: milestones } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Fetch tickets for this project
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, title, status, priority, description, scheduled_date, created_at, updated_at, agents:assigned_agent_id(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const allActivities: ActivityItem[] = [];
    const completed: TicketSummary[] = [];
    const pending: TicketSummary[] = [];

    // Process job updates
    if (jobUpdates) {
      jobUpdates.forEach((update: any) => {
        allActivities.push({
          id: `job-${update.id}`,
          type: 'job_update',
          title: getStatusLabel(update.status),
          description: update.notes || `Ticket: ${update.tickets?.title}`,
          timestamp: update.created_at,
          agent: update.agents?.full_name,
          status: update.status,
        });
      });
    }

    // Process milestones
    if (milestones) {
      milestones.forEach((milestone: any) => {
        if (milestone.status === 'completed' && milestone.completed_at) {
          allActivities.push({
            id: `milestone-completed-${milestone.id}`,
            type: 'milestone',
            title: `Milestone completed: ${milestone.name}`,
            description: milestone.description,
            timestamp: milestone.completed_at,
            status: 'completed',
          });
        }
        allActivities.push({
          id: `milestone-created-${milestone.id}`,
          type: 'milestone',
          title: `Milestone added: ${milestone.name}`,
          description: `Due: ${format(new Date(milestone.due_date), 'MMM d, yyyy')}`,
          timestamp: milestone.created_at,
          status: milestone.status,
        });
      });
    }

    // Process tickets
    if (tickets) {
      tickets.forEach((ticket: any) => {
        const ticketSummary: TicketSummary = {
          id: ticket.id,
          title: ticket.title,
          status: ticket.status || 'pending',
          priority: ticket.priority,
          agent: ticket.agents?.full_name || null,
          description: ticket.description,
          scheduledDate: ticket.scheduled_date,
        };

        if (ticket.status === 'completed') {
          completed.push(ticketSummary);
          allActivities.push({
            id: `ticket-completed-${ticket.id}`,
            type: 'ticket_completed',
            title: `Ticket completed: ${ticket.title}`,
            description: ticket.description,
            timestamp: ticket.updated_at,
            agent: ticket.agents?.full_name,
            status: 'completed',
          });
        } else {
          pending.push(ticketSummary);
        }

        allActivities.push({
          id: `ticket-created-${ticket.id}`,
          type: 'ticket_created',
          title: `Ticket created: ${ticket.title}`,
          description: null,
          timestamp: ticket.created_at,
          agent: ticket.agents?.full_name,
        });
      });
    }

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(allActivities);
    setCompletedTickets(completed);
    setPendingTickets(pending);
    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Job assigned';
      case 'en_route': return 'Agent en route';
      case 'on_site': return 'Agent arrived on site';
      case 'working': return 'Work in progress';
      case 'completed': return 'Job completed';
      case 'cancelled': return 'Job cancelled';
      default: return status;
    }
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'job_update':
        if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
        if (status === 'en_route') return <MapPin className="h-4 w-4" />;
        if (status === 'working' || status === 'on_site') return <Wrench className="h-4 w-4" />;
        return <PlayCircle className="h-4 w-4" />;
      case 'milestone':
        return <Flag className="h-4 w-4" />;
      case 'ticket_created':
        return <FileText className="h-4 w-4" />;
      case 'ticket_completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string, status?: string) => {
    if (status === 'completed') return 'bg-success text-success-foreground';
    if (status === 'cancelled') return 'bg-destructive text-destructive-foreground';
    switch (type) {
      case 'job_update':
        return 'bg-info text-info-foreground';
      case 'milestone':
        return 'bg-warning text-warning-foreground';
      case 'ticket_created':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground text-xs">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-info text-info-foreground text-xs">In Progress</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const totalTickets = completedTickets.length + pendingTickets.length;
  const progressPercent = totalTickets > 0 ? Math.round((completedTickets.length / totalTickets) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Project Progress
        </h3>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Work Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedTickets.length} of {totalTickets} tasks completed
            </span>
            <span className="font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>{completedTickets.length} Done</span>
            </div>
            <div className="flex items-center gap-1">
              <CircleDot className="h-3 w-3 text-warning" />
              <span>{pendingTickets.length} Remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Done/Needed/Timeline */}
      <Tabs defaultValue="needed" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="needed" className="text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            Needed ({pendingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="done" className="text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Done ({completedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm">
            <Clock className="h-4 w-4 mr-1" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* What's Needed */}
        <TabsContent value="needed" className="mt-4">
          {pendingTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success opacity-70" />
              <p className="text-sm font-medium">All tasks completed!</p>
              <p className="text-xs mt-1">No pending work for this project.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTickets.map((ticket) => (
                <Card key={ticket.id} className="border-l-4 border-l-warning">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ticket.title}</p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ticket.scheduledDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {ticket.agent && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Assigned to: {ticket.agent}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* What's Been Done */}
        <TabsContent value="done" className="mt-4">
          {completedTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No completed tasks yet.</p>
              <p className="text-xs mt-1">Completed work will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTickets.map((ticket) => (
                <Card key={ticket.id} className="border-l-4 border-l-success">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          {ticket.title}
                        </p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 pl-6">
                          {getStatusBadge(ticket.status)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ticket.scheduledDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {ticket.agent && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground pl-6">
                        <User className="h-3 w-3" />
                        <span>Completed by: {ticket.agent}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Timeline */}
        <TabsContent value="timeline" className="mt-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity recorded yet.</p>
              <p className="text-xs mt-1">Job updates and milestones will appear here.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {/* Project Start marker */}
                {projectStartDate && (
                  <div className="flex gap-4 relative">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                      "bg-primary text-primary-foreground"
                    )}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-medium text-sm">Project Started</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(projectStartDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                      getActivityColor(activity.type, activity.status)
                    )}>
                      {getActivityIcon(activity.type, activity.status)}
                    </div>
                    <div className="flex-1 pt-1 pb-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                        {activity.agent && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.agent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};