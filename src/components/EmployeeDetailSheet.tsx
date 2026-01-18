import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Phone, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  Ticket, 
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Timer,
  TrendingUp,
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
  email?: string | null;
}

interface EmployeeDetailSheetProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmployeeDetailSheet = ({ agent, open, onOpenChange }: EmployeeDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch assigned projects
  const { data: assignedProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['employee-assigned-projects', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('project_agents')
        .select(`
          *,
          projects (
            id, name, status, address, start_date, end_date,
            clients (full_name)
          )
        `)
        .eq('agent_id', agent.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!agent?.id,
  });

  // Fetch assigned tickets
  const { data: assignedTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['employee-assigned-tickets', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id, title, status, priority, scheduled_date, scheduled_time, total_time_minutes,
          projects (name)
        `)
        .eq('assigned_agent_id', agent.id)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!agent?.id,
  });

  // Fetch time clock entries
  const { data: timeClockEntries, isLoading: timeClockLoading } = useQuery({
    queryKey: ['employee-time-clock', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('time_clock_entries')
        .select('*')
        .eq('agent_id', agent.id)
        .order('clock_in', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!agent?.id,
  });

  // Fetch job updates (activity history)
  const { data: jobUpdates, isLoading: updatesLoading } = useQuery({
    queryKey: ['employee-job-updates', agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data, error } = await supabase
        .from('job_updates')
        .select(`
          *,
          tickets (title, projects (name))
        `)
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!agent?.id,
  });

  // Calculate stats
  const totalTickets = assignedTickets?.length || 0;
  const completedTickets = assignedTickets?.filter(t => t.status === 'completed').length || 0;
  const totalTimeMinutes = assignedTickets?.reduce((sum, t) => sum + (t.total_time_minutes || 0), 0) || 0;
  const totalClockHours = timeClockEntries?.reduce((sum, entry) => {
    if (entry.clock_in && entry.clock_out) {
      const minutes = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 60000;
      return sum + minutes - (entry.break_minutes || 0);
    }
    return sum;
  }, 0) || 0;

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'working': case 'on_site': return 'secondary';
      case 'en_route': return 'outline';
      case 'pending': case 'open': return 'destructive';
      default: return 'outline';
    }
  };

  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-hidden flex flex-col">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-2xl bg-primary/20">
                {agent.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{agent.full_name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant={agent.is_online ? (agent.is_available ? 'default' : 'secondary') : 'outline'}>
                  {agent.is_online ? (agent.is_available ? 'Available' : 'Busy') : 'Offline'}
                </Badge>
                {agent.last_location_update && (
                  <span className="text-xs text-muted-foreground">
                    Last active {formatDistanceToNow(new Date(agent.last_location_update), { addSuffix: true })}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agent.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  {agent.vehicle_info && (
                    <div className="flex items-center gap-3 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{agent.vehicle_info}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {format(new Date(agent.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  {agent.current_location_lat && agent.current_location_lng && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {agent.current_location_lat.toFixed(6)}, {agent.current_location_lng.toFixed(6)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{completedTickets}/{totalTickets}</p>
                        <p className="text-xs text-muted-foreground">Tickets Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Timer className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatMinutes(totalTimeMinutes)}</p>
                        <p className="text-xs text-muted-foreground">Time on Tickets</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{assignedProjects?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Assigned Projects</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatMinutes(Math.round(totalClockHours))}</p>
                        <p className="text-xs text-muted-foreground">Clock Time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {updatesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : jobUpdates && jobUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {jobUpdates.slice(0, 5).map((update: any) => (
                        <div key={update.id} className="flex items-start gap-3 text-sm">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-2",
                            update.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{update.tickets?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {update.status?.replace('_', ' ')} • {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assigned Tickets</CardTitle>
                  <CardDescription>{totalTickets} tickets assigned</CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : assignedTickets && assignedTickets.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedTickets.map((ticket: any) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium max-w-[150px] truncate">
                              {ticket.title}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[100px] truncate">
                              {ticket.projects?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                                {ticket.status?.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ticket.scheduled_date ? format(new Date(ticket.scheduled_date), 'MMM d') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No tickets assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assigned Projects</CardTitle>
                  <CardDescription>{assignedProjects?.length || 0} projects assigned</CardDescription>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : assignedProjects && assignedProjects.length > 0 ? (
                    <div className="space-y-3">
                      {assignedProjects.map((pa: any) => (
                        <div key={pa.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{pa.projects?.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {pa.projects?.address || 'No address'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Client: {pa.projects?.clients?.full_name || 'No client'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="text-xs">{pa.role || 'Member'}</Badge>
                              <Badge variant={pa.projects?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {pa.projects?.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No projects assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Time Clock History</CardTitle>
                  <CardDescription>Recent clock in/out entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {timeClockLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : timeClockEntries && timeClockEntries.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeClockEntries.map((entry: any) => {
                          const hours = entry.clock_out 
                            ? ((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000 - (entry.break_minutes || 0) / 60).toFixed(1)
                            : '-';
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs">
                                {format(new Date(entry.clock_in), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(entry.clock_in), 'h:mm a')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : (
                                  <Badge variant="outline" className="text-xs">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {hours !== '-' ? `${hours}h` : hours}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No time clock entries</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
