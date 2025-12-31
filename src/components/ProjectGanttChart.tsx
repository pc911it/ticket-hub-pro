import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

interface ProjectGanttChartProps {
  projectId: string;
  projectName: string;
  projectStartDate: string | null;
  projectEndDate: string | null;
  milestones: Milestone[];
  tickets: ProjectTicket[];
}

type ViewMode = 'day' | 'week' | 'month';

export const ProjectGanttChart = ({
  projectName,
  projectStartDate,
  projectEndDate,
  milestones,
  tickets,
}: ProjectGanttChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const getBarPosition = (date: string) => {
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
  };

  const getProjectBarWidth = () => {
    if (!projectStartDate || !projectEndDate) return 0;
    const start = new Date(projectStartDate);
    const end = new Date(projectEndDate);
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
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header with dates */}
            <div className="flex border-b bg-muted/30">
              <div className="w-48 shrink-0 p-3 font-medium text-sm border-r">
                Item
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

            {/* Tickets */}
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex border-b hover:bg-muted/20 transition-colors">
                <div className="w-48 shrink-0 p-3 text-sm border-r flex items-center gap-2">
                  <Ticket className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{ticket.title}</span>
                </div>
                <div className="relative h-10 flex items-center" style={{ width: totalWidth }}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-5 rounded cursor-pointer transition-transform hover:scale-y-125",
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
                        <Badge variant="outline" className="text-xs mt-1 capitalize">
                          {ticket.status || 'pending'}
                        </Badge>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}

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