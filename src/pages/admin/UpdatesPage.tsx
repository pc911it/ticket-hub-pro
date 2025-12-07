import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  MapPin,
  Bell,
  Truck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Image
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobUpdate {
  id: string;
  status: string;
  notes: string | null;
  location_lat: number | null;
  location_lng: number | null;
  photo_url: string | null;
  created_at: string;
  tickets: { 
    id: string; 
    title: string; 
    clients: { full_name: string } | null;
  } | null;
  agents: { full_name: string; phone: string | null } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  assigned: { label: 'Assigned', color: 'bg-info/10 text-info', icon: Bell },
  en_route: { label: 'En Route', color: 'bg-warning/10 text-warning', icon: Truck },
  on_site: { label: 'On Site', color: 'bg-primary/10 text-primary', icon: MapPin },
  working: { label: 'Working', color: 'bg-secondary/20 text-secondary-foreground', icon: Wrench },
  completed: { label: 'Completed', color: 'bg-success/10 text-success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const UpdatesPage = () => {
  const [updates, setUpdates] = useState<JobUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchUpdates();
    setupRealtimeSubscription();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('job_updates')
        .select(`
          *,
          tickets(id, title, clients(full_name)),
          agents(full_name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUpdates(data as JobUpdate[] || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('job-updates-page-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_updates' },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredUpdates = updates.filter(update => {
    const matchesSearch = 
      update.tickets?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.agents?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || update.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group updates by date
  const groupedUpdates: Record<string, JobUpdate[]> = {};
  filteredUpdates.forEach(update => {
    const date = format(new Date(update.created_at), 'yyyy-MM-dd');
    if (!groupedUpdates[date]) {
      groupedUpdates[date] = [];
    }
    groupedUpdates[date].push(update);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Job Updates</h1>
        <p className="text-muted-foreground mt-1">Real-time updates from field agents.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Updates Timeline */}
      {filteredUpdates.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No updates found matching your filters.' 
                : 'No job updates yet. Updates will appear here when agents update their status.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedUpdates).map(([date, dateUpdates]) => (
            <div key={date}>
              <h3 className="font-medium text-sm text-muted-foreground mb-4 sticky top-0 bg-background py-2">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-3">
                {dateUpdates.map((update, index) => {
                  const config = statusConfig[update.status] || statusConfig.assigned;
                  const Icon = config.icon;

                  return (
                    <Card
                      key={update.id}
                      className="border-0 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="w-0.5 flex-1 bg-border mt-2" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {update.agents?.full_name}
                                  <span className="text-muted-foreground font-normal"> → </span>
                                  <Badge variant="outline" className={cn("ml-1", config.color)}>
                                    {config.label}
                                  </Badge>
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {update.tickets?.title}
                                  {update.tickets?.clients && (
                                    <span> • {update.tickets.clients.full_name}</span>
                                  )}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(update.created_at), 'h:mm a')}
                              </span>
                            </div>

                            {update.notes && (
                              <p className="mt-3 text-sm bg-muted/50 rounded-lg p-3">
                                {update.notes}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              {update.location_lat && update.location_lng && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location recorded
                                </span>
                              )}
                              {update.photo_url && (
                                <span className="flex items-center gap-1">
                                  <Image className="h-3 w-3" />
                                  Photo attached
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatesPage;