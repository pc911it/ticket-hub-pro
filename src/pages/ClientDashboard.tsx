import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function ClientDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [clientEmail, setClientEmail] = useState<string | null>(null);

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
          projects (name)
        `)
        .eq("client_id", clientRecord.id)
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      assigned: { variant: "secondary", label: "Assigned" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    
    const statusInfo = statusMap[status || "pending"] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getJobStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      assigned: { color: "bg-blue-100 text-blue-800", label: "Assigned" },
      en_route: { color: "bg-yellow-100 text-yellow-800", label: "En Route" },
      on_site: { color: "bg-purple-100 text-purple-800", label: "On Site" },
      working: { color: "bg-orange-100 text-orange-800", label: "Working" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    };
    
    const statusInfo = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const activeTickets = tickets?.filter(t => t.status !== "completed" && t.status !== "cancelled") || [];
  const completedTickets = tickets?.filter(t => t.status === "completed") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Client Portal</h1>
              <p className="text-sm text-muted-foreground">{clientRecord?.full_name || clientEmail}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.filter(p => p.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobUpdates?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {!clientRecord && !projectsLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Client Record Found</h3>
              <p className="text-muted-foreground">
                Your email is not associated with a client account. Please contact the company administrator.
              </p>
            </CardContent>
          </Card>
        )}

        {clientRecord && (
          <Tabs defaultValue="projects" className="space-y-4">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="updates">Recent Updates</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              {projectsLoading ? (
                <p className="text-muted-foreground">Loading projects...</p>
              ) : projects?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {projects?.map((project) => (
                    <Card key={project.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription>{project.description}</CardDescription>
                          </div>
                          <Badge variant={project.status === "active" ? "default" : "secondary"}>
                            {project.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {project.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {project.address}
                          </div>
                        )}
                        {project.start_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Started: {format(new Date(project.start_date), "MMM d, yyyy")}
                          </div>
                        )}
                        {project.budget && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Budget: ${project.budget.toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tickets" className="space-y-4">
              {ticketsLoading ? (
                <p className="text-muted-foreground">Loading tickets...</p>
              ) : tickets?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tickets found.</p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {tickets?.map((ticket) => (
                      <Card key={ticket.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{ticket.title}</h4>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {ticket.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(ticket.scheduled_date), "MMM d, yyyy")}
                                </span>
                                <span>{ticket.scheduled_time}</span>
                                {(ticket as any).projects?.name && (
                                  <span className="flex items-center gap-1">
                                    <FolderOpen className="h-3 w-3" />
                                    {(ticket as any).projects.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(ticket.status)}
                              {ticket.priority && (
                                <Badge variant={ticket.priority === "high" ? "destructive" : "outline"} className="text-xs">
                                  {ticket.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              {!jobUpdates || jobUpdates.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent updates.</p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {jobUpdates?.map((update) => (
                      <Card key={update.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{(update as any).tickets?.title}</h4>
                                {getJobStatusBadge(update.status)}
                              </div>
                              {update.notes && (
                                <p className="text-sm text-muted-foreground">{update.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {(update as any).agents?.full_name && `By ${(update as any).agents.full_name} • `}
                                {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
