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
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  type: 'job_update' | 'milestone' | 'ticket_created' | 'ticket_completed';
  title: string;
  description: string | null;
  timestamp: string;
  agent?: string;
  status?: string;
}

interface ProjectActivityTimelineProps {
  projectId: string;
  projectStartDate?: string | null;
}

export const ProjectActivityTimeline = ({ projectId, projectStartDate }: ProjectActivityTimelineProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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
      .select('id, title, status, created_at, updated_at, agents:assigned_agent_id(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const allActivities: ActivityItem[] = [];

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
        allActivities.push({
          id: `ticket-created-${ticket.id}`,
          type: 'ticket_created',
          title: `Ticket created: ${ticket.title}`,
          description: null,
          timestamp: ticket.created_at,
          agent: ticket.agents?.full_name,
        });
        if (ticket.status === 'completed') {
          allActivities.push({
            id: `ticket-completed-${ticket.id}`,
            type: 'ticket_completed',
            title: `Ticket completed: ${ticket.title}`,
            description: null,
            timestamp: ticket.updated_at,
            agent: ticket.agents?.full_name,
            status: 'completed',
          });
        }
      });
    }

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(allActivities);
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

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Activity Timeline
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
    <div className="space-y-4">
      <h3 className="font-display font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Activity Timeline
      </h3>

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
    </div>
  );
};
