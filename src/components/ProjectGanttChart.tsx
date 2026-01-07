import { useMemo, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, addWeeks, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Ticket, Download, Users, GripVertical, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: string;
  completed_at: string | null;
}

interface ProjectTicket {
  id: string;
  title: string;
  status: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number | null;
  assigned_agent_id?: string | null;
  agent_name?: string | null;
}

interface ProjectGanttChartProps {
  projectId: string;
  projectName: string;
  projectStartDate: string | null;
  projectEndDate: string | null;
  milestones: Milestone[];
  tickets: ProjectTicket[];
  onTicketReschedule?: (ticketId: string, newDate: string) => void;
}

type ViewMode = 'day' | 'week' | 'month';
type ChartView = 'timeline' | 'resources';

export const ProjectGanttChart = ({
  projectName,
  projectStartDate,
  projectEndDate,
  milestones,
  tickets,
  onTicketReschedule,
}: ProjectGanttChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [chartView, setChartView] = useState<ChartView>('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'in_progress':
        return 'bg-info';
      case 'pending':
        return 'bg-warning';
      case 'cancelled':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'in_progress':
        return 'bg-info text-info-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const { dateRange, columns, columnWidth } = useMemo(() => {
    let start: Date;
    let end: Date;
    let cols: Date[];
    let width: number;

    if (viewMode === 'day') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      cols = eachDayOfInterval({ start, end });
      width = 40;
    } else if (viewMode === 'week') {
      start = startOfWeek(subMonths(currentDate, 1));
      end = endOfWeek(addMonths(currentDate, 2));
      cols = eachWeekOfInterval({ start, end });
      width = 80;
    } else {
      start = startOfMonth(subMonths(currentDate, 2));
      end = endOfMonth(addMonths(currentDate, 6));
      const monthCols: Date[] = [];
      let current = start;
      while (current <= end) {
        monthCols.push(startOfMonth(current));
        current = addMonths(current, 1);
      }
      cols = monthCols;
      width = 120;
    }

    return { dateRange: { start, end }, columns: cols, columnWidth: width };
  }, [viewMode, currentDate]);

  const navigatePrev = () => {
    if (viewMode === 'day') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, -4));
    } else {
      setCurrentDate(subMonths(currentDate, 3));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 4));
    } else {
      setCurrentDate(addMonths(currentDate, 3));
    }
  };

  const getBarPosition = useCallback((date: string) => {
    const itemDate = new Date(date);
    const daysDiff = differenceInDays(itemDate, dateRange.start);
    
    if (viewMode === 'day') {
      return daysDiff * columnWidth;
    } else if (viewMode === 'week') {
      const weeksDiff = Math.floor(daysDiff / 7);
      const dayOfWeek = daysDiff % 7;
      return weeksDiff * columnWidth + (dayOfWeek / 7) * columnWidth;
    } else {
      const monthsDiff = (itemDate.getFullYear() - dateRange.start.getFullYear()) * 12 + 
                         (itemDate.getMonth() - dateRange.start.getMonth());
      const dayOfMonth = itemDate.getDate() - 1;
      const daysInMonth = new Date(itemDate.getFullYear(), itemDate.getMonth() + 1, 0).getDate();
      return monthsDiff * columnWidth + (dayOfMonth / daysInMonth) * columnWidth;
    }
  }, [viewMode, columnWidth, dateRange.start]);

  const getDateFromPosition = useCallback((position: number): string => {
    let daysDiff: number;
    
    if (viewMode === 'day') {
      daysDiff = Math.round(position / columnWidth);
    } else if (viewMode === 'week') {
      const weeksDiff = Math.floor(position / columnWidth);
      const dayInWeek = Math.round(((position % columnWidth) / columnWidth) * 7);
      daysDiff = weeksDiff * 7 + dayInWeek;
    } else {
      const monthsDiff = Math.floor(position / columnWidth);
      const dayInMonth = Math.round(((position % columnWidth) / columnWidth) * 30);
      const targetDate = addMonths(dateRange.start, monthsDiff);
      return format(addDays(targetDate, dayInMonth), 'yyyy-MM-dd');
    }
    
    const newDate = addDays(dateRange.start, daysDiff);
    return format(newDate, 'yyyy-MM-dd');
  }, [viewMode, columnWidth, dateRange.start]);

  const getProjectBarWidth = () => {
    if (!projectStartDate || !projectEndDate) return 0;
    const startPos = getBarPosition(projectStartDate);
    const endPos = getBarPosition(projectEndDate);
    return Math.max(endPos - startPos, columnWidth);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const formatColumnHeader = (date: Date) => {
    if (viewMode === 'day') {
      return format(date, 'd');
    } else if (viewMode === 'week') {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM yyyy');
    }
  };

  // Export as PNG using canvas
  const exportAsImage = async () => {
    if (!chartRef.current) return;
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `${projectName}-gantt-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Gantt chart exported as image');
    } catch (error) {
      toast.error('Failed to export image');
    }
  };

  const exportAsPDF = async () => {
    if (!chartRef.current) return;
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${projectName}-gantt-chart.pdf`);
      toast.success('Gantt chart exported as PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  // Drag handlers for rescheduling
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicket(ticketId);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTicket) return;

    const chartRect = chartRef.current?.querySelector('.gantt-timeline')?.getBoundingClientRect();
    if (!chartRect) return;

    const dropX = e.clientX - chartRect.left - dragOffset - 192;
    const newDate = getDateFromPosition(Math.max(0, dropX));

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ scheduled_date: newDate })
        .eq('id', draggedTicket);

      if (error) throw error;

      toast.success('Ticket rescheduled successfully');
      onTicketReschedule?.(draggedTicket, newDate);
    } catch (error) {
      toast.error('Failed to reschedule ticket');
    }

    setDraggedTicket(null);
  };

  const handleDragEnd = () => {
    setDraggedTicket(null);
  };

  // Group tickets by agent for resource allocation view
  const ticketsByAgent = useMemo(() => {
    const grouped: Record<string, { agentName: string; tickets: ProjectTicket[] }> = {};
    const unassigned: ProjectTicket[] = [];

    tickets.forEach((ticket) => {
      if (ticket.assigned_agent_id && ticket.agent_name) {
        if (!grouped[ticket.assigned_agent_id]) {
          grouped[ticket.assigned_agent_id] = {
            agentName: ticket.agent_name,
            tickets: [],
          };
        }
        grouped[ticket.assigned_agent_id].tickets.push(ticket);
      } else {
        unassigned.push(ticket);
      }
    });

    return { grouped, unassigned };
  }, [tickets]);

  const totalWidth = columns.length * columnWidth;

  if (!projectStartDate && !projectEndDate && milestones.length === 0 && tickets.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Project Timeline (Gantt)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline data available.</p>
            <p className="text-sm">Add project dates, milestones, or tickets to see the Gantt chart.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Project Timeline (Gantt)
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={chartView} onValueChange={(v) => setChartView(v as ChartView)} className="mr-2">
              <TabsList className="h-9">
                <TabsTrigger value="timeline" className="text-xs px-3">
                  <Calendar className="h-3 w-3 mr-1" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="resources" className="text-xs px-3">
                  <Users className="h-3 w-3 mr-1" />
                  Resources
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportAsImage}>
                  <Image className="h-4 w-4 mr-2" />
                  Export as Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAsPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div 
            ref={chartRef} 
            className="min-w-[600px] gantt-timeline"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Header with dates */}
            <div className="flex border-b bg-muted/30">
              <div className="w-48 shrink-0 p-3 font-medium text-sm border-r">
                {chartView === 'timeline' ? 'Item' : 'Agent / Task'}
              </div>
              <div className="flex" style={{ width: totalWidth }}>
                {columns.map((col, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "text-center text-xs py-2 border-r border-border/50",
                      isToday(col) && "bg-primary/10 font-medium"
                    )}
                    style={{ width: columnWidth }}
                  >
                    {formatColumnHeader(col)}
                    {viewMode === 'day' && (
                      <div className="text-[10px] text-muted-foreground">
                        {format(col, 'EEE')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {chartView === 'timeline' ? (
              <>
                {/* Project Bar */}
                {projectStartDate && projectEndDate && (
                  <div className="flex border-b hover:bg-muted/20 transition-colors">
                    <div className="w-48 shrink-0 p-3 text-sm font-medium border-r truncate">
                      📁 {projectName}
                    </div>
                    <div className="relative h-12 flex items-center" style={{ width: totalWidth }}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute h-6 bg-primary/80 rounded-md cursor-pointer hover:bg-primary transition-colors"
                              style={{
                                left: getBarPosition(projectStartDate),
                                width: getProjectBarWidth(),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{projectName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(projectStartDate), 'MMM d, yyyy')} - {format(new Date(projectEndDate), 'MMM d, yyyy')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="flex border-b hover:bg-muted/20 transition-colors">
                    <div className="w-48 shrink-0 p-3 text-sm border-r flex items-center gap-2">
                      <span className="text-primary">🎯</span>
                      <span className="truncate">{milestone.name}</span>
                    </div>
                    <div className="relative h-10 flex items-center" style={{ width: totalWidth }}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute w-4 h-4 rotate-45 cursor-pointer transition-transform hover:scale-125",
                                getMilestoneStatusColor(milestone.status)
                              )}
                              style={{
                                left: getBarPosition(milestone.due_date) - 8,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{milestone.name}</p>
                            <p className="text-xs">Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}</p>
                            <Badge variant="outline" className="text-xs mt-1 capitalize">
                              {milestone.status}
                            </Badge>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}

                {/* Tickets - Draggable */}
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex border-b hover:bg-muted/20 transition-colors">
                    <div className="w-48 shrink-0 p-3 text-sm border-r flex items-center gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                      <Ticket className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{ticket.title}</span>
                    </div>
                    <div className="relative h-10 flex items-center" style={{ width: totalWidth }}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, ticket.id)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "absolute h-5 rounded cursor-grab transition-transform hover:scale-y-125",
                                draggedTicket === ticket.id ? "opacity-50" : "",
                                getStatusColor(ticket.status)
                              )}
                              style={{
                                left: getBarPosition(ticket.scheduled_date),
                                width: Math.max(columnWidth / 2, 20),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{ticket.title}</p>
                            <p className="text-xs">
                              {format(new Date(ticket.scheduled_date), 'MMM d, yyyy')} at {ticket.scheduled_time}
                            </p>
                            <p className="text-xs text-muted-foreground">Drag to reschedule</p>
                            <Badge variant="outline" className="text-xs mt-1 capitalize">
                              {ticket.status || 'pending'}
                            </Badge>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              /* Resource Allocation View */
              <>
                {Object.entries(ticketsByAgent.grouped).map(([agentId, { agentName, tickets: agentTickets }]) => (
                  <div key={agentId}>
                    <div className="flex border-b bg-muted/50">
                      <div className="w-48 shrink-0 p-3 text-sm font-medium border-r flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {agentName}
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {agentTickets.length}
                        </Badge>
                      </div>
                      <div className="relative h-10 flex items-center" style={{ width: totalWidth }}>
                        {agentTickets.map((ticket) => (
                          <TooltipProvider key={ticket.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "absolute h-5 rounded-sm",
                                    getStatusColor(ticket.status)
                                  )}
                                  style={{
                                    left: getBarPosition(ticket.scheduled_date),
                                    width: Math.max(columnWidth / 3, 16),
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{ticket.title}</p>
                                <p className="text-xs">{format(new Date(ticket.scheduled_date), 'MMM d, yyyy')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                    {agentTickets.map((ticket) => (
                      <div key={ticket.id} className="flex border-b hover:bg-muted/20 transition-colors">
                        <div className="w-48 shrink-0 p-3 text-sm border-r flex items-center gap-2 pl-8">
                          <Ticket className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate text-muted-foreground">{ticket.title}</span>
                        </div>
                        <div className="relative h-8 flex items-center" style={{ width: totalWidth }}>
                          <div
                            className={cn(
                              "absolute h-4 rounded-sm",
                              getStatusColor(ticket.status)
                            )}
                            style={{
                              left: getBarPosition(ticket.scheduled_date),
                              width: Math.max(columnWidth / 2, 20),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {ticketsByAgent.unassigned.length > 0 && (
                  <div>
                    <div className="flex border-b bg-warning/10">
                      <div className="w-48 shrink-0 p-3 text-sm font-medium border-r flex items-center gap-2">
                        <Users className="h-4 w-4 text-warning" />
                        Unassigned
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {ticketsByAgent.unassigned.length}
                        </Badge>
                      </div>
                      <div className="relative h-10 flex items-center" style={{ width: totalWidth }} />
                    </div>
                    {ticketsByAgent.unassigned.map((ticket) => (
                      <div key={ticket.id} className="flex border-b hover:bg-muted/20 transition-colors">
                        <div className="w-48 shrink-0 p-3 text-sm border-r flex items-center gap-2 pl-8">
                          <Ticket className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate text-muted-foreground">{ticket.title}</span>
                        </div>
                        <div className="relative h-8 flex items-center" style={{ width: totalWidth }}>
                          <div
                            className={cn(
                              "absolute h-4 rounded-sm",
                              getStatusColor(ticket.status)
                            )}
                            style={{
                              left: getBarPosition(ticket.scheduled_date),
                              width: Math.max(columnWidth / 2, 20),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Today indicator line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 pointer-events-none"
              style={{
                left: 192 + getBarPosition(new Date().toISOString().split('T')[0]),
              }}
            />
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
