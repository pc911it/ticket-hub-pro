import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  clients: { full_name: string } | null;
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, [currentMonth]);

  const fetchTickets = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('tickets')
      .select('*, clients(full_name)')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_time', { ascending: true });

    if (!error && data) {
      setTickets(data);
    }
    setLoading(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTicketsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tickets.filter(t => t.scheduled_date === dateStr);
  };

  const selectedDateTickets = selectedDate ? getTicketsForDay(selectedDate) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'completed': return 'bg-info';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View and manage your scheduled appointments.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="font-display">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const dayTickets = getTicketsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square p-1 rounded-lg transition-all duration-200 hover:bg-muted relative",
                      !isCurrentMonth && "opacity-40",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      isToday && !isSelected && "ring-2 ring-secondary ring-inset"
                    )}
                  >
                    <span className="text-sm">{format(day, 'd')}</span>
                    {dayTickets.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayTickets.slice(0, 3).map((t, i) => (
                          <div 
                            key={i} 
                            className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(t.status))} 
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected day details */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedDate 
                ? `${selectedDateTickets.length} appointment${selectedDateTickets.length !== 1 ? 's' : ''}` 
                : 'Click on a date to see appointments'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDateTickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No appointments for this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateTickets.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{ticket.scheduled_time}</span>
                        <span className={cn(
                          "ml-auto px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          ticket.status === 'confirmed' && "bg-success/10 text-success",
                          ticket.status === 'pending' && "bg-warning/10 text-warning",
                          ticket.status === 'completed' && "bg-info/10 text-info",
                          ticket.status === 'cancelled' && "bg-destructive/10 text-destructive"
                        )}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">{ticket.clients?.full_name}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a date from the calendar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import { Calendar } from 'lucide-react';

export default CalendarPage;
