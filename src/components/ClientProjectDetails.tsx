import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  FolderOpen,
  MapPin,
  Target,
  Ticket,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  status: string;
  completed_at: string | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  agents: { full_name: string } | null;
  client_approved_at: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  progress: number;
  phase: string;
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
}

interface ClientProjectDetailsProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientProjectDetails({ project, open, onOpenChange }: ClientProjectDetailsProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && project?.id) {
      fetchProjectData();
    }
  }, [open, project?.id]);

  const fetchProjectData = async () => {
    setLoading(true);
    
    const [{ data: milestonesData }, { data: workOrdersData }] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("tickets")
        .select("id, title, description, status, scheduled_date, scheduled_time, client_approved_at, agents(full_name)")
        .eq("project_id", project.id)
        .is("deleted_at", null)
        .order("scheduled_date", { ascending: false }),
    ]);

    if (milestonesData) setMilestones(milestonesData);
    if (workOrdersData) setWorkOrders(workOrdersData);
    setLoading(false);
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.status === "completed") {
      return { color: "text-success", bg: "bg-success/10", icon: <CheckCircle2 className="h-4 w-4" />, label: "Completed" };
    }
    if (isPast(new Date(milestone.due_date)) && !isToday(new Date(milestone.due_date))) {
      return { color: "text-destructive", bg: "bg-destructive/10", icon: <AlertCircle className="h-4 w-4" />, label: "Overdue" };
    }
    if (isToday(new Date(milestone.due_date))) {
      return { color: "text-warning", bg: "bg-warning/10", icon: <Clock className="h-4 w-4" />, label: "Due Today" };
    }
    return { color: "text-muted-foreground", bg: "bg-muted", icon: <Target className="h-4 w-4" />, label: "Upcoming" };
  };

  const getWorkOrderStatus = (status: string) => {
    const config: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "text-warning", bg: "bg-warning/10", icon: <Clock className="h-4 w-4" />, label: "Pending" },
      confirmed: { color: "text-info", bg: "bg-info/10", icon: <CheckCircle className="h-4 w-4" />, label: "Confirmed" },
      in_progress: { color: "text-primary", bg: "bg-primary/10", icon: <Wrench className="h-4 w-4" />, label: "In Progress" },
      completed: { color: "text-success", bg: "bg-success/10", icon: <CheckCircle className="h-4 w-4" />, label: "Completed" },
      cancelled: { color: "text-destructive", bg: "bg-destructive/10", icon: <AlertCircle className="h-4 w-4" />, label: "Cancelled" },
    };
    return config[status] || config.pending;
  };

  const phaseConfig: Record<string, { color: string; label: string }> = {
    planning: { color: "text-muted-foreground", label: "Planning" },
    starting: { color: "text-info", label: "Starting" },
    active: { color: "text-primary", label: "Active" },
    in_progress: { color: "text-warning", label: "In Progress" },
    finalizing: { color: "text-amber-600", label: "Finalizing" },
    completed: { color: "text-success", label: "Completed" },
  };

  const phase = phaseConfig[project.phase] || phaseConfig.planning;
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const upcomingMilestones = milestones.filter(m => m.status !== "completed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate">{project.name}</DialogTitle>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline" className={cn("text-xs", phase.color)}>
                  {phase.label}
                </Badge>
                {project.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {project.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-2xl font-bold">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <p className="text-2xl font-bold text-success">{project.completedTickets}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-2xl font-bold text-primary">{project.inProgressTickets || 0}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{project.totalTickets}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  {project.start_date && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Started: {format(new Date(project.start_date), "MMM d, yyyy")}
                      </span>
                      {project.end_date && (
                        <span>Due: {format(new Date(project.end_date), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs defaultValue="milestones" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="milestones" className="gap-2">
                    <Target className="h-4 w-4" />
                    Milestones
                    {milestones.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5">{milestones.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="work-orders" className="gap-2">
                    <Ticket className="h-4 w-4" />
                    Work Orders
                    {workOrders.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5">{workOrders.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="milestones" className="m-0 space-y-4">
                  {milestones.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No milestones set for this project</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Milestone Progress */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Milestone Progress</span>
                            <span className="font-medium">{completedMilestones} of {milestones.length} completed</span>
                          </div>
                          <Progress 
                            value={(completedMilestones / milestones.length) * 100} 
                            className="h-2 mt-2" 
                          />
                        </CardContent>
                      </Card>

                      {/* Timeline */}
                      <div className="space-y-3">
                        {milestones.map((milestone, index) => {
                          const status = getMilestoneStatus(milestone);
                          return (
                            <Card key={milestone.id} className={cn(
                              "border transition-colors",
                              milestone.status === "completed" && "border-success/30 bg-success/5"
                            )}>
                              <CardContent className="p-4">
                                <div className="flex gap-3">
                                  <div className={cn("p-2 rounded-lg h-fit", status.bg, status.color)}>
                                    {status.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-medium">{milestone.name}</h4>
                                      <Badge variant="outline" className={cn("shrink-0", status.color)}>
                                        {status.label}
                                      </Badge>
                                    </div>
                                    {milestone.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Due: {format(new Date(milestone.due_date), "MMM d, yyyy")}
                                      </span>
                                      {milestone.completed_at && (
                                        <span className="text-success">
                                          Completed {formatDistanceToNow(new Date(milestone.completed_at), { addSuffix: true })}
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
                    </>
                  )}
                </TabsContent>

                <TabsContent value="work-orders" className="m-0 space-y-3">
                  {workOrders.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No work orders for this project</p>
                      </CardContent>
                    </Card>
                  ) : (
                    workOrders.map((order) => {
                      const status = getWorkOrderStatus(order.status);
                      return (
                        <Card key={order.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <div className={cn("p-2 rounded-lg h-fit", status.bg, status.color)}>
                                {status.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium">{order.title}</h4>
                                  <Badge variant="outline" className={cn("shrink-0", status.color)}>
                                    {status.label}
                                  </Badge>
                                </div>
                                {order.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{order.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(order.scheduled_date), "MMM d, yyyy")}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {order.scheduled_time}
                                  </span>
                                  {order.agents?.full_name && (
                                    <span>Assigned to: {order.agents.full_name}</span>
                                  )}
                                </div>
                                {order.status === "completed" && (
                                  <div className="mt-2">
                                    {order.client_approved_at ? (
                                      <Badge variant="outline" className="text-success border-success">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Approved
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Awaiting Approval
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}