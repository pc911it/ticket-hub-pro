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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  FolderOpen, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  LogOut,
  User,
  Calendar,
  MapPin,
  FileText,
  Plus,
  ArrowRight,
  Activity,
  Wrench,
  CircleDot
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClientDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    priority: 'normal',
    project_id: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Get user's email from profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.email) {
        setClientEmail(data.email);
      } else {
        setClientEmail(user.email || null);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Fetch client record by email
  const { data: clientRecord } = useQuery({
    queryKey: ["client-record", clientEmail],
    queryFn: async () => {
      if (!clientEmail) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("email", clientEmail)
        .is("deleted_at", null)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientEmail,
  });

  // Fetch projects for this client
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["client-projects", clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientRecord.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientRecord?.id,
  });

  // Fetch tickets for this client
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["client-tickets", clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          projects (name),
          agents (full_name)
        `)
        .eq("client_id", clientRecord.id)
        .is("deleted_at", null)
        .order("scheduled_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientRecord?.id,
  });

  // Fetch job updates for client's tickets
  const { data: jobUpdates } = useQuery({
    queryKey: ["client-job-updates", tickets],
    queryFn: async () => {
      if (!tickets || tickets.length === 0) return [];
      
      const ticketIds = tickets.map(t => t.id);
      
      const { data, error } = await supabase
        .from("job_updates")
        .select(`
          *,
          tickets (title),
          agents (full_name)
        `)
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tickets && tickets.length > 0,
  });

  // Submit work request mutation
  const submitRequest = useMutation({
    mutationFn: async (data: typeof requestForm) => {
      if (!clientRecord?.id || !clientRecord?.company_id) {
        throw new Error("Client record not found");
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error } = await supabase.from("tickets").insert({
        client_id: clientRecord.id,
        company_id: clientRecord.company_id,
        project_id: data.project_id || null,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "pending",
        scheduled_date: tomorrow.toISOString().split('T')[0],
        scheduled_time: "09:00",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Submitted", description: "Your work request has been submitted successfully." });
      setIsRequestDialogOpen(false);
      setRequestForm({ title: '', description: '', priority: 'normal', project_id: '' });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to submit request." });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a title for your request." });
      return;
    }
    submitRequest.mutate(requestForm);
  };

  const getStatusConfig = (status: string | null) => {
    const config: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "text-warning", bg: "bg-warning/10", icon: <Clock className="h-4 w-4" />, label: "Pending" },
      confirmed: { color: "text-info", bg: "bg-info/10", icon: <CheckCircle className="h-4 w-4" />, label: "Confirmed" },
      in_progress: { color: "text-primary", bg: "bg-primary/10", icon: <Wrench className="h-4 w-4" />, label: "In Progress" },
      completed: { color: "text-success", bg: "bg-success/10", icon: <CheckCircle className="h-4 w-4" />, label: "Completed" },
      cancelled: { color: "text-destructive", bg: "bg-destructive/10", icon: <AlertCircle className="h-4 w-4" />, label: "Cancelled" },
    };
    return config[status || "pending"] || config.pending;
  };

  const getJobStatusConfig = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      assigned: { color: "bg-info/10 text-info border-info/30", label: "Assigned" },
      en_route: { color: "bg-warning/10 text-warning border-warning/30", label: "En Route" },
      on_site: { color: "bg-primary/10 text-primary border-primary/30", label: "On Site" },
      working: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Working" },
      completed: { color: "bg-success/10 text-success border-success/30", label: "Completed" },
      cancelled: { color: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
    };
    return config[status] || { color: "bg-muted text-muted-foreground", label: status };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activeTickets = tickets?.filter(t => t.status !== "completed" && t.status !== "cancelled") || [];
  const completedTickets = tickets?.filter(t => t.status === "completed") || [];
  const pendingTickets = tickets?.filter(t => t.status === "pending") || [];
  const inProgressTickets = tickets?.filter(t => t.status === "confirmed" || t.status === "in_progress") || [];
  
  const completionRate = tickets && tickets.length > 0 
    ? Math.round((completedTickets.length / tickets.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome back, {clientRecord?.full_name?.split(' ')[0] || 'Client'}</h1>
              <p className="text-sm text-muted-foreground">{clientEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Work
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request New Work</DialogTitle>
                  <DialogDescription>
                    Submit a new work request. Our team will review and schedule it.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">What do you need? *</Label>
                    <Input
                      id="title"
                      value={requestForm.title}
                      onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                      placeholder="e.g., Repair alarm sensor, Install new camera"
                      required
                    />
                  </div>
                  {projects && projects.length > 0 && (
                    <div className="space-y-2">
                      <Label>Related Project</Label>
                      <Select
                        value={requestForm.project_id}
                        onValueChange={(value) => setRequestForm({ ...requestForm, project_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={requestForm.priority}
                      onValueChange={(value) => setRequestForm({ ...requestForm, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Can wait</SelectItem>
                        <SelectItem value="normal">Normal - Standard timing</SelectItem>
                        <SelectItem value="high">High - Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Additional Details</Label>
                    <Textarea
                      id="description"
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      placeholder="Describe the issue or work needed..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitRequest.isPending}>
                      {submitRequest.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Awaiting Review</p>
                  <p className="text-2xl font-bold">{pendingTickets.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressTickets.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedTickets.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-info">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-info" />
                </div>
              </div>
              <Progress value={completionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {!clientRecord && !projectsLoading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Client Record Found</h3>
              <p className="text-muted-foreground">
                Your email is not associated with a client account. Please contact the company administrator.
              </p>
            </CardContent>
          </Card>
        )}

        {clientRecord && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - Work Orders */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Your Work Orders
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => setIsRequestDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Request
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="active" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="active" className="gap-2">
                        Active
                        {activeTickets.length > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5">{activeTickets.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="completed">Completed</TabsTrigger>
                      <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="m-0">
                      {activeTickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>No active work orders</p>
                          <Button variant="link" onClick={() => setIsRequestDialogOpen(true)}>
                            Request new work <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-3">
                            {activeTickets.map((ticket) => {
                              const statusConfig = getStatusConfig(ticket.status);
                              return (
                                <Card key={ticket.id} className="border shadow-sm">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className={cn("p-2 rounded-lg", statusConfig.bg, statusConfig.color)}>
                                        {statusConfig.icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-medium">{ticket.title}</h4>
                                          <Badge variant="outline" className={cn("shrink-0", 
                                            ticket.priority === "high" && "border-destructive text-destructive"
                                          )}>
                                            {ticket.priority || "normal"}
                                          </Badge>
                                        </div>
                                        {ticket.description && (
                                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {ticket.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(ticket.scheduled_date), "MMM d")}
                                          </span>
                                          {(ticket as any).agents?.full_name && (
                                            <span className="flex items-center gap-1">
                                              <User className="h-3 w-3" />
                                              {(ticket as any).agents.full_name}
                                            </span>
                                          )}
                                          {(ticket as any).projects?.name && (
                                            <span className="flex items-center gap-1">
                                              <FolderOpen className="h-3 w-3" />
                                              {(ticket as any).projects.name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>

                    <TabsContent value="completed" className="m-0">
                      {completedTickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>No completed work orders yet</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-3">
                            {completedTickets.map((ticket) => (
                              <Card key={ticket.id} className="border shadow-sm bg-success/5">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-success/10 text-success">
                                      <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium">{ticket.title}</h4>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>Completed {format(new Date(ticket.scheduled_date), "MMM d, yyyy")}</span>
                                        {(ticket as any).projects?.name && (
                                          <span className="flex items-center gap-1">
                                            <FolderOpen className="h-3 w-3" />
                                            {(ticket as any).projects.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>

                    <TabsContent value="all" className="m-0">
                      {tickets?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>No work orders found</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-3">
                            {tickets?.map((ticket) => {
                              const statusConfig = getStatusConfig(ticket.status);
                              return (
                                <Card key={ticket.id} className="border shadow-sm">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className={cn("p-2 rounded-lg", statusConfig.bg, statusConfig.color)}>
                                        {statusConfig.icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-medium">{ticket.title}</h4>
                                          <Badge variant="outline" className="shrink-0">
                                            {statusConfig.label}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <span>{format(new Date(ticket.scheduled_date), "MMM d, yyyy")}</span>
                                          {(ticket as any).projects?.name && (
                                            <span className="flex items-center gap-1">
                                              <FolderOpen className="h-3 w-3" />
                                              {(ticket as any).projects.name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Recent Activity & Projects */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!jobUpdates || jobUpdates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent updates</p>
                  ) : (
                    <div className="space-y-4">
                      {jobUpdates.slice(0, 5).map((update, index) => {
                        const statusConfig = getJobStatusConfig(update.status);
                        return (
                          <div key={update.id} className="flex gap-3">
                            <div className="relative">
                              <CircleDot className={cn("h-4 w-4 mt-0.5", 
                                update.status === "completed" ? "text-success" : "text-primary"
                              )} />
                              {index < Math.min(jobUpdates.length - 1, 4) && (
                                <div className="absolute left-[7px] top-5 w-0.5 h-[calc(100%+8px)] bg-border" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-4">
                              <p className="text-sm font-medium truncate">{(update as any).tickets?.title}</p>
                              <Badge variant="outline" className={cn("text-xs mt-1", statusConfig.color)}>
                                {statusConfig.label}
                              </Badge>
                              {update.notes && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{update.notes}</p>
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

              {/* Your Projects */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Your Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : projects?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No projects</p>
                  ) : (
                    <div className="space-y-3">
                      {projects?.slice(0, 5).map((project) => (
                        <div key={project.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium">{project.name}</h4>
                            <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-xs">
                              {project.status}
                            </Badge>
                          </div>
                          {project.address && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {project.address}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}