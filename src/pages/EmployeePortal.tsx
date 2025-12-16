import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TicketProgressTracker } from "@/components/TicketProgressTracker";
import { 
  FolderOpen, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  LogOut,
  User,
  Calendar,
  Plus,
  Play,
  Pause,
  Square,
  Timer,
  Briefcase,
  ClipboardList,
  FileText,
  Download
} from "lucide-react";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeEntry {
  ticketId: string;
  startTime: Date;
  isRunning: boolean;
}

interface TimeLog {
  id: string;
  ticketId: string;
  ticketTitle: string;
  projectName: string;
  minutes: number;
  loggedAt: Date;
}

export default function EmployeePortal() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeReportPeriod, setTimeReportPeriod] = useState<"week" | "month" | "all">("week");
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    project_id: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimeEntry?.isRunning) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - activeTimeEntry.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  // Get agent record for current user
  const { data: agentRecord } = useQuery({
    queryKey: ["agent-record", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("agents")
        .select("*, company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch projects assigned to this agent
  const { data: assignedProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["assigned-projects", agentRecord?.id],
    queryFn: async () => {
      if (!agentRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("project_agents")
        .select(`
          *,
          projects (
            id,
            name,
            description,
            status,
            address,
            start_date,
            end_date,
            clients (full_name)
          )
        `)
        .eq("agent_id", agentRecord.id);
      
      if (error) throw error;
      return data?.map(pa => ({ ...pa.projects, assignment_role: pa.role })) || [];
    },
    enabled: !!agentRecord?.id,
  });

  // Fetch tickets for assigned projects
  const { data: myTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["employee-tickets", agentRecord?.id, assignedProjects],
    queryFn: async () => {
      if (!agentRecord?.id || !assignedProjects?.length) return [];
      
      const projectIds = assignedProjects.map(p => p.id);
      
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          projects (name),
          clients (full_name),
          agents (full_name)
        `)
        .in("project_id", projectIds)
        .is("deleted_at", null)
        .order("scheduled_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentRecord?.id && !!assignedProjects?.length,
  });

  // Fetch job updates (time tracking history) for this agent
  const { data: timeHistory, isLoading: timeHistoryLoading } = useQuery({
    queryKey: ["employee-time-history", agentRecord?.id],
    queryFn: async () => {
      if (!agentRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("job_updates")
        .select(`
          *,
          tickets (
            id,
            title,
            total_time_minutes,
            projects (name)
          )
        `)
        .eq("agent_id", agentRecord.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentRecord?.id,
  });

  // Create ticket mutation
  const createTicket = useMutation({
    mutationFn: async (data: typeof ticketForm) => {
      if (!agentRecord?.company_id) throw new Error("No company associated");
      
      // Get client_id from the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("client_id")
        .eq("id", data.project_id)
        .single();
      
      if (projectError || !project?.client_id) {
        throw new Error("Project has no associated client");
      }

      const { data: ticketData, error } = await supabase.from("tickets").insert({
        company_id: agentRecord.company_id,
        project_id: data.project_id,
        client_id: project.client_id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "pending",
        admin_approval_status: "approved", // Employee-created tickets are auto-approved
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        assigned_agent_id: agentRecord.id,
      }).select().single();

      if (error) throw error;
      return ticketData;
    },
    onSuccess: () => {
      toast({ title: "Ticket Created", description: "The ticket has been created and assigned to you." });
      setIsCreateTicketOpen(false);
      setTicketForm({
        title: '',
        description: '',
        priority: 'normal',
        project_id: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '09:00',
      });
      queryClient.invalidateQueries({ queryKey: ["employee-tickets"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create ticket." });
    },
  });

  // Update ticket status
  const updateTicketStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", ticketId);
      
      if (error) throw error;
      
      // Create job update
      if (agentRecord?.id) {
        await supabase.from("job_updates").insert({
          ticket_id: ticketId,
          agent_id: agentRecord.id,
          status: status as any,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["employee-tickets"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Log time mutation
  const logTime = useMutation({
    mutationFn: async ({ ticketId, minutes }: { ticketId: string; minutes: number }) => {
      // Get current total_time_minutes
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select("total_time_minutes")
        .eq("id", ticketId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newTotal = (ticket?.total_time_minutes || 0) + minutes;
      
      const { error } = await supabase
        .from("tickets")
        .update({ total_time_minutes: newTotal })
        .eq("id", ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Time Logged" });
      queryClient.invalidateQueries({ queryKey: ["employee-tickets"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.project_id) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all required fields." });
      return;
    }
    createTicket.mutate(ticketForm);
  };

  const startTimer = (ticketId: string) => {
    setActiveTimeEntry({
      ticketId,
      startTime: new Date(),
      isRunning: true,
    });
    setElapsedTime(0);
  };

  const stopTimer = () => {
    if (activeTimeEntry) {
      const minutes = Math.ceil(elapsedTime / 60);
      if (minutes > 0) {
        logTime.mutate({ ticketId: activeTimeEntry.ticketId, minutes });
      }
      setActiveTimeEntry(null);
      setElapsedTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Calculate time for reports
  const getFilteredTimeData = () => {
    if (!myTickets) return { tickets: [], totalMinutes: 0 };
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    if (timeReportPeriod === "week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (timeReportPeriod === "month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = new Date(0); // All time
    }
    
    const filteredTickets = myTickets.filter(ticket => {
      if (!ticket.total_time_minutes || ticket.total_time_minutes === 0) return false;
      const ticketDate = parseISO(ticket.scheduled_date);
      return isWithinInterval(ticketDate, { start: startDate, end: endDate });
    });
    
    const totalMinutes = filteredTickets.reduce((acc, t) => acc + (t.total_time_minutes || 0), 0);
    
    return { tickets: filteredTickets, totalMinutes };
  };

  const generateTimeReport = () => {
    const { tickets, totalMinutes } = getFilteredTimeData();
    
    let reportContent = `TIME REPORT - ${timeReportPeriod.toUpperCase()}\n`;
    reportContent += `Generated: ${format(new Date(), 'PPP')}\n`;
    reportContent += `Employee: ${agentRecord?.full_name || user?.email}\n`;
    reportContent += `=`.repeat(50) + '\n\n';
    
    reportContent += `SUMMARY\n`;
    reportContent += `-`.repeat(30) + '\n';
    reportContent += `Total Hours: ${formatMinutes(totalMinutes)}\n`;
    reportContent += `Total Tickets: ${tickets.length}\n\n`;
    
    reportContent += `DETAILED BREAKDOWN\n`;
    reportContent += `-`.repeat(30) + '\n';
    
    tickets.forEach(ticket => {
      reportContent += `\nTicket: ${ticket.title}\n`;
      reportContent += `Project: ${ticket.projects?.name || 'N/A'}\n`;
      reportContent += `Date: ${format(parseISO(ticket.scheduled_date), 'PPP')}\n`;
      reportContent += `Time Logged: ${formatMinutes(ticket.total_time_minutes || 0)}\n`;
      reportContent += `Status: ${ticket.status}\n`;
    });
    
    // Download report
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${timeReportPeriod}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Report Downloaded", description: "Time report has been downloaded." });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'in_progress': case 'working': return 'bg-primary/10 text-primary';
      case 'on_site': return 'bg-warning/10 text-warning';
      case 'en_route': return 'bg-info/10 text-info';
      case 'assigned': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/10 text-destructive';
      case 'high': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!agentRecord) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-warning mb-4" />
        <h1 className="text-xl font-semibold mb-2">Employee Access Required</h1>
        <p className="text-muted-foreground text-center mb-4">
          You are not registered as an employee/agent. Please contact your administrator.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Go Back
        </Button>
      </div>
    );
  }

  const activeTickets = myTickets?.filter(t => t.status !== 'completed') || [];
  const completedTickets = myTickets?.filter(t => t.status === 'completed') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Employee Portal</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Active Timer Banner */}
      {activeTimeEntry && (
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 animate-pulse" />
              <span className="font-medium">Timer Running</span>
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={stopTimer}>
              <Square className="h-4 w-4 mr-2" />
              Stop & Log Time
            </Button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignedProjects?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeTickets.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedTickets.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round((myTickets?.reduce((acc, t) => acc + (t.total_time_minutes || 0), 0) || 0) / 60)}h
                  </p>
                  <p className="text-xs text-muted-foreground">Logged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tickets" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="tickets">My Tickets</TabsTrigger>
              <TabsTrigger value="projects">Assigned Projects</TabsTrigger>
              <TabsTrigger value="time-history">Time History</TabsTrigger>
            </TabsList>
            <Button onClick={() => setIsCreateTicketOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>

          <TabsContent value="tickets" className="space-y-4">
            {ticketsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : activeTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active tickets</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeTickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{ticket.title}</h3>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority || 'normal'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {ticket.projects?.name} • {ticket.clients?.full_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(ticket.scheduled_date), 'MMM d')}
                            </span>
                            {ticket.total_time_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {Math.round(ticket.total_time_minutes / 60)}h {ticket.total_time_minutes % 60}m
                              </span>
                            )}
                          </div>
                          <div className="mt-3">
                            <TicketProgressTracker status={ticket.status} compact />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={ticket.status || 'pending'}
                            onValueChange={(value) => updateTicketStatus.mutate({ ticketId: ticket.id, status: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="en_route">En Route</SelectItem>
                              <SelectItem value="on_site">On Site</SelectItem>
                              <SelectItem value="working">Working</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          {activeTimeEntry?.ticketId === ticket.id ? (
                            <Button variant="destructive" size="sm" onClick={stopTimer}>
                              <Square className="h-4 w-4 mr-1" />
                              Stop
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => startTimer(ticket.id)}
                              disabled={!!activeTimeEntry}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completedTickets.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3">Completed ({completedTickets.length})</h3>
                <div className="space-y-2">
                  {completedTickets.slice(0, 5).map((ticket) => (
                    <Card key={ticket.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{ticket.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.projects?.name} • {ticket.total_time_minutes ? `${Math.round(ticket.total_time_minutes / 60)}h logged` : 'No time logged'}
                            </p>
                          </div>
                          <Badge className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {projectsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : assignedProjects?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {assignedProjects?.map((project: any) => {
                  const projectTickets = myTickets?.filter(t => t.project_id === project.id) || [];
                  const completed = projectTickets.filter(t => t.status === 'completed').length;
                  const progress = projectTickets.length > 0 ? Math.round((completed / projectTickets.length) * 100) : 0;
                  
                  return (
                    <Card key={project.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription>{project.clients?.full_name}</CardDescription>
                          </div>
                          <Badge variant="outline">{project.assignment_role || 'Member'}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{completed}/{projectTickets.length} tickets</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <Button 
                          className="w-full mt-4" 
                          variant="outline"
                          onClick={() => {
                            setTicketForm(prev => ({ ...prev, project_id: project.id }));
                            setIsCreateTicketOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Ticket
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Time History Tab */}
          <TabsContent value="time-history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Tracking History
                    </CardTitle>
                    <CardDescription>View your logged hours and generate payroll reports</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={timeReportPeriod} onValueChange={(v: "week" | "month" | "all") => setTimeReportPeriod(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={generateTimeReport} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <p className="text-sm text-muted-foreground">Total Hours ({timeReportPeriod})</p>
                    <p className="text-2xl font-bold text-primary">{formatMinutes(getFilteredTimeData().totalMinutes)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/5 border">
                    <p className="text-sm text-muted-foreground">Tickets Worked</p>
                    <p className="text-2xl font-bold text-success">{getFilteredTimeData().tickets.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/5 border">
                    <p className="text-sm text-muted-foreground">Avg per Ticket</p>
                    <p className="text-2xl font-bold text-warning">
                      {getFilteredTimeData().tickets.length > 0 
                        ? formatMinutes(Math.round(getFilteredTimeData().totalMinutes / getFilteredTimeData().tickets.length))
                        : '0m'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-info/5 border">
                    <p className="text-sm text-muted-foreground">All Time Total</p>
                    <p className="text-2xl font-bold text-info">
                      {formatMinutes(myTickets?.reduce((acc, t) => acc + (t.total_time_minutes || 0), 0) || 0)}
                    </p>
                  </div>
                </div>

                {/* Time Entries Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time Logged</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredTimeData().tickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No time entries for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredTimeData().tickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{ticket.title}</TableCell>
                            <TableCell>{ticket.projects?.name || 'N/A'}</TableCell>
                            <TableCell>{format(parseISO(ticket.scheduled_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {formatMinutes(ticket.total_time_minutes || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Create a ticket for one of your assigned projects.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={ticketForm.project_id}
                onValueChange={(value) => setTicketForm(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {assignedProjects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={ticketForm.title}
                onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter ticket title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the work to be done..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Scheduled Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={ticketForm.scheduled_date}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
