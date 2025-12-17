import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  Search,
  Timer,
  Briefcase
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";

export default function EmployeeTimeReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"week" | "month" | "all">("week");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get user's company ID
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.company_id;
    },
    enabled: !!user?.id,
  });

  const companyId = userCompany;

  // Fetch all agents in company
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["company-agents", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("company_id", companyId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch time clock entries
  const { data: timeClockEntries, isLoading: clockLoading } = useQuery({
    queryKey: ["company-time-clock", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("time_clock_entries")
        .select(`
          *,
          agents (full_name)
        `)
        .eq("company_id", companyId)
        .order("clock_in", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch time report submissions
  const { data: timeReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["company-time-reports", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("time_report_submissions")
        .select(`
          *,
          agents (full_name)
        `)
        .eq("company_id", companyId)
        .order("submitted_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch all tickets with time for agents
  const { data: ticketsWithTime } = useQuery({
    queryKey: ["company-tickets-time", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          total_time_minutes,
          assigned_agent_id,
          scheduled_date,
          agents (full_name)
        `)
        .eq("company_id", companyId)
        .not("total_time_minutes", "is", null)
        .gt("total_time_minutes", 0);
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Update report status
  const updateReportStatus = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("time_report_submissions")
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq("id", reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report Updated" });
      queryClient.invalidateQueries({ queryKey: ["company-time-reports"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Calculate totals per agent
  const getAgentSummary = () => {
    if (!agents) return [];
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    if (periodFilter === "week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (periodFilter === "month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = new Date(0);
    }

    return agents.map(agent => {
      // Calculate clock time
      const agentClockEntries = timeClockEntries?.filter(e => {
        if (e.agent_id !== agent.id) return false;
        const clockDate = new Date(e.clock_in);
        return isWithinInterval(clockDate, { start: startDate, end: endDate });
      }) || [];
      
      const totalClockMinutes = agentClockEntries.reduce((acc, entry) => {
        if (!entry.clock_out) return acc;
        const diffMs = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
        const mins = Math.floor(diffMs / 60000) - (entry.break_minutes || 0);
        return acc + mins;
      }, 0);

      // Calculate ticket time
      const agentTickets = ticketsWithTime?.filter(t => {
        if (t.assigned_agent_id !== agent.id) return false;
        const ticketDate = parseISO(t.scheduled_date);
        return isWithinInterval(ticketDate, { start: startDate, end: endDate });
      }) || [];
      
      const totalTicketMinutes = agentTickets.reduce((acc, t) => acc + (t.total_time_minutes || 0), 0);

      return {
        ...agent,
        totalClockMinutes,
        totalTicketMinutes,
        ticketCount: agentTickets.length,
        clockEntryCount: agentClockEntries.length,
      };
    }).filter(a => 
      searchTerm === "" || 
      a.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const agentSummary = getAgentSummary();
  const totalCompanyClockMinutes = agentSummary.reduce((acc, a) => acc + a.totalClockMinutes, 0);
  const totalCompanyTicketMinutes = agentSummary.reduce((acc, a) => acc + a.totalTicketMinutes, 0);

  const filteredReports = timeReports?.filter(r => 
    statusFilter === "all" || r.status === statusFilter
  ) || [];

  const generateCSVReport = () => {
    let csv = "Employee,Clock Hours,Ticket Hours,Tickets Worked,Clock Entries\n";
    agentSummary.forEach(agent => {
      csv += `"${agent.full_name}",${formatMinutes(agent.totalClockMinutes)},${formatMinutes(agent.totalTicketMinutes)},${agent.ticketCount},${agent.clockEntryCount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "Report Downloaded" });
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Time Reports</h1>
            <p className="text-muted-foreground">View and manage employee time tracking across your company</p>
          </div>
          <Button onClick={generateCSVReport} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground">{agents?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground truncate">{formatMinutes(totalCompanyClockMinutes)}</p>
                  <p className="text-xs text-muted-foreground">Clock Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                  <Timer className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground truncate">{formatMinutes(totalCompanyTicketMinutes)}</p>
                  <p className="text-xs text-muted-foreground">Ticket Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground">{filteredReports.filter(r => r.status === 'submitted').length}</p>
                  <p className="text-xs text-muted-foreground">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={periodFilter} onValueChange={(v: "week" | "month" | "all") => setPeriodFilter(v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Employee Summary</TabsTrigger>
            <TabsTrigger value="submissions">Report Submissions</TabsTrigger>
            <TabsTrigger value="clock-entries">Clock Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Employee Time Summary</CardTitle>
                <CardDescription>Overview of hours worked per employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Employee</TableHead>
                        <TableHead>Clock Hours</TableHead>
                        <TableHead>Ticket Hours</TableHead>
                        <TableHead>Tickets</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                        </TableRow>
                      ) : agentSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No employees found
                          </TableCell>
                        </TableRow>
                      ) : (
                        agentSummary.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                                  {agent.full_name.charAt(0)}
                                </div>
                                <span className="font-medium text-foreground">{agent.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {formatMinutes(agent.totalClockMinutes)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {formatMinutes(agent.totalTicketMinutes)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground">{agent.ticketCount}</TableCell>
                            <TableCell>
                              <Badge variant={agent.is_online ? "default" : "secondary"} className={agent.is_online ? "bg-success text-success-foreground" : ""}>
                                {agent.is_online ? "Online" : "Offline"}
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

          <TabsContent value="submissions">
            <Card className="border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-foreground">Time Report Submissions</CardTitle>
                    <CardDescription>Review and approve employee time reports</CardDescription>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="submitted">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Employee</TableHead>
                        <TableHead className="min-w-[140px]">Period</TableHead>
                        <TableHead>Clock Hours</TableHead>
                        <TableHead>Ticket Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                        </TableRow>
                      ) : filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No submissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report: any) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium text-foreground">{report.agents?.full_name}</TableCell>
                            <TableCell className="text-foreground">
                              {format(parseISO(report.period_start), 'MMM d')} - {format(parseISO(report.period_end), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {formatMinutes(report.total_clock_minutes || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {formatMinutes(report.total_ticket_minutes || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={report.status === 'approved' ? "default" : report.status === 'rejected' ? "destructive" : "secondary"}
                                className={report.status === 'approved' ? "bg-success text-success-foreground" : ""}
                              >
                                {report.status === 'submitted' ? 'Pending' : report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {report.status === 'submitted' && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-success hover:text-success hover:bg-success/10"
                                    onClick={() => updateReportStatus.mutate({ reportId: report.id, status: 'approved' })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => updateReportStatus.mutate({ reportId: report.id, status: 'rejected' })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
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

          <TabsContent value="clock-entries">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Clock-In/Out History</CardTitle>
                <CardDescription>All employee clock entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Employee</TableHead>
                        <TableHead className="min-w-[130px]">Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Break</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="min-w-[150px]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clockLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                        </TableRow>
                      ) : !timeClockEntries?.length ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No clock entries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        timeClockEntries.slice(0, 50).map((entry: any) => {
                          const totalMins = entry.clock_out 
                            ? Math.floor((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 60000) - (entry.break_minutes || 0)
                            : null;
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium text-foreground">{entry.agents?.full_name}</TableCell>
                              <TableCell className="text-foreground">{format(new Date(entry.clock_in), 'MMM d, h:mm a')}</TableCell>
                              <TableCell>
                                {entry.clock_out ? (
                                  <span className="text-foreground">{format(new Date(entry.clock_out), 'h:mm a')}</span>
                                ) : (
                                  <Badge className="bg-success text-success-foreground">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-foreground">{entry.break_minutes || 0}m</TableCell>
                              <TableCell className="text-foreground">
                                {totalMins !== null ? formatMinutes(totalMins) : '-'}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-muted-foreground">{entry.notes || '-'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
