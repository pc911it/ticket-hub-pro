import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { 
  Plus, 
  Search, 
  Calendar,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Thermometer,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  Camera,
  CheckCircle
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const weatherOptions = [
  { value: 'sunny', label: 'Sunny', icon: Sun },
  { value: 'cloudy', label: 'Cloudy', icon: Cloud },
  { value: 'rainy', label: 'Rainy', icon: CloudRain },
  { value: 'snow', label: 'Snow', icon: CloudSnow },
];

const DailyLogsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    project_id: '',
    log_date: format(new Date(), 'yyyy-MM-dd'),
    weather_conditions: 'sunny',
    temperature_high: '',
    temperature_low: '',
    work_performed: '',
    materials_used: '',
    equipment_used: '',
    safety_incidents: '',
    visitor_log: '',
    delays_issues: '',
    notes: '',
    crew_count: '',
    hours_worked: '',
  });

  const { data: dailyLogs, isLoading } = useQuery({
    queryKey: ['daily-logs', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('log_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-logs', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null)
        .eq('status', 'in_progress');
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('daily_logs').insert({
        company_id: effectiveCompanyId,
        project_id: data.project_id,
        log_date: data.log_date,
        weather_conditions: data.weather_conditions,
        temperature_high: data.temperature_high ? parseInt(data.temperature_high) : null,
        temperature_low: data.temperature_low ? parseInt(data.temperature_low) : null,
        work_performed: data.work_performed,
        materials_used: data.materials_used,
        equipment_used: data.equipment_used,
        safety_incidents: data.safety_incidents,
        visitor_log: data.visitor_log,
        delays_issues: data.delays_issues,
        notes: data.notes,
        crew_count: data.crew_count ? parseInt(data.crew_count) : null,
        hours_worked: data.hours_worked ? parseFloat(data.hours_worked) : null,
        submitted_by: user?.id,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success('Daily log created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('A log for this project and date already exists');
      } else {
        toast.error('Failed to create daily log');
      }
    },
  });

  const resetForm = () => {
    setFormData({
      project_id: '',
      log_date: format(new Date(), 'yyyy-MM-dd'),
      weather_conditions: 'sunny',
      temperature_high: '',
      temperature_low: '',
      work_performed: '',
      materials_used: '',
      equipment_used: '',
      safety_incidents: '',
      visitor_log: '',
      delays_issues: '',
      notes: '',
      crew_count: '',
      hours_worked: '',
    });
  };

  const filteredLogs = dailyLogs?.filter(log => {
    const matchesSearch = log.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.work_performed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || log.project_id === projectFilter;
    return matchesSearch && matchesProject;
  }) || [];

  // Group logs by date for the week view
  const thisWeekLogs = filteredLogs.filter(log => {
    const logDate = parseISO(log.log_date);
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    return logDate >= weekStart && logDate <= weekEnd;
  });

  const stats = [
    { title: 'Total Logs', value: dailyLogs?.length || 0, icon: FileText, color: 'text-blue-500' },
    { title: 'This Week', value: thisWeekLogs.length, icon: Calendar, color: 'text-purple-500' },
    { title: 'Total Crew Hours', value: `${(dailyLogs?.reduce((sum, l) => sum + ((l.crew_count || 0) * (l.hours_worked || 0)), 0) || 0).toLocaleString()}h`, icon: Clock, color: 'text-green-500' },
    { title: 'Safety Incidents', value: dailyLogs?.filter(l => l.safety_incidents).length || 0, icon: AlertTriangle, color: 'text-red-500' },
  ];

  const getWeatherIcon = (weather: string) => {
    const option = weatherOptions.find(w => w.value === weather);
    const Icon = option?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <FeatureGate featureKey="daily_logs" showUpgradePrompt featureName="Daily Logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Logs</h1>
            <p className="text-muted-foreground">Track daily project activities and field reports</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Daily Log
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {filteredLogs.map((log) => (
            <Card 
              key={log.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedLog(log)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold">{format(parseISO(log.log_date), 'd')}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(log.log_date), 'MMM yyyy')}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{log.projects?.name}</h3>
                        {isToday(parseISO(log.log_date)) && (
                          <Badge variant="secondary">Today</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {log.work_performed || 'No work details recorded'}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getWeatherIcon(log.weather_conditions)}
                          {log.temperature_high && `${log.temperature_high}°`}
                        </span>
                        {log.crew_count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {log.crew_count} workers
                          </span>
                        )}
                        {log.hours_worked && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.hours_worked}h
                          </span>
                        )}
                        {log.safety_incidents && (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            Safety incident
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.approved_at ? (
                      <Badge className="bg-green-500/10 text-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending Review</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredLogs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No daily logs found. Create your first log to get started.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Daily Log</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label>Project *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.log_date}
                    onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                    required
                  />
                </div>

                <Separator className="col-span-2" />
                <h4 className="col-span-2 font-medium">Weather Conditions</h4>

                <div>
                  <Label>Weather</Label>
                  <Select
                    value={formData.weather_conditions}
                    onValueChange={(v) => setFormData({ ...formData, weather_conditions: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weatherOptions.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          <span className="flex items-center gap-2">
                            <w.icon className="h-4 w-4" />
                            {w.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>High (°F)</Label>
                    <Input
                      type="number"
                      value={formData.temperature_high}
                      onChange={(e) => setFormData({ ...formData, temperature_high: e.target.value })}
                      placeholder="High"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Low (°F)</Label>
                    <Input
                      type="number"
                      value={formData.temperature_low}
                      onChange={(e) => setFormData({ ...formData, temperature_low: e.target.value })}
                      placeholder="Low"
                    />
                  </div>
                </div>

                <Separator className="col-span-2" />
                <h4 className="col-span-2 font-medium">Work Details</h4>

                <div className="col-span-2">
                  <Label>Work Performed</Label>
                  <Textarea
                    value={formData.work_performed}
                    onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                    rows={4}
                    placeholder="Describe work completed today..."
                  />
                </div>
                <div>
                  <Label>Crew Count</Label>
                  <Input
                    type="number"
                    value={formData.crew_count}
                    onChange={(e) => setFormData({ ...formData, crew_count: e.target.value })}
                    placeholder="Number of workers"
                  />
                </div>
                <div>
                  <Label>Hours Worked</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.hours_worked}
                    onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                    placeholder="Total hours"
                  />
                </div>
                <div>
                  <Label>Materials Used</Label>
                  <Textarea
                    value={formData.materials_used}
                    onChange={(e) => setFormData({ ...formData, materials_used: e.target.value })}
                    rows={2}
                    placeholder="List materials used..."
                  />
                </div>
                <div>
                  <Label>Equipment Used</Label>
                  <Textarea
                    value={formData.equipment_used}
                    onChange={(e) => setFormData({ ...formData, equipment_used: e.target.value })}
                    rows={2}
                    placeholder="List equipment used..."
                  />
                </div>

                <Separator className="col-span-2" />
                <h4 className="col-span-2 font-medium">Issues & Notes</h4>

                <div>
                  <Label>Delays / Issues</Label>
                  <Textarea
                    value={formData.delays_issues}
                    onChange={(e) => setFormData({ ...formData, delays_issues: e.target.value })}
                    rows={2}
                    placeholder="Any delays or issues..."
                  />
                </div>
                <div>
                  <Label>Safety Incidents</Label>
                  <Textarea
                    value={formData.safety_incidents}
                    onChange={(e) => setFormData({ ...formData, safety_incidents: e.target.value })}
                    rows={2}
                    placeholder="Report any safety incidents..."
                  />
                </div>
                <div>
                  <Label>Visitor Log</Label>
                  <Textarea
                    value={formData.visitor_log}
                    onChange={(e) => setFormData({ ...formData, visitor_log: e.target.value })}
                    rows={2}
                    placeholder="List site visitors..."
                  />
                </div>
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Any other notes..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.project_id}>
                  {createMutation.isPending ? 'Creating...' : 'Submit Log'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedLog && (
              <>
                <SheetHeader>
                  <SheetTitle>
                    Daily Log - {format(parseISO(selectedLog.log_date), 'MMMM d, yyyy')}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <h4 className="font-medium">{selectedLog.projects?.name}</h4>
                    {selectedLog.approved_at ? (
                      <Badge className="bg-green-500/10 text-green-500 mt-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved on {format(new Date(selectedLog.approved_at), 'MMM d, yyyy')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-2">Pending Review</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      {getWeatherIcon(selectedLog.weather_conditions)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {weatherOptions.find(w => w.value === selectedLog.weather_conditions)?.label}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Thermometer className="h-4 w-4 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedLog.temperature_high ? `${selectedLog.temperature_high}° / ${selectedLog.temperature_low || '-'}°` : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Users className="h-4 w-4 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedLog.crew_count || 0} workers
                      </p>
                    </div>
                  </div>

                  {selectedLog.work_performed && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Work Performed</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.work_performed}
                      </p>
                    </div>
                  )}

                  {selectedLog.materials_used && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Materials Used</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.materials_used}
                      </p>
                    </div>
                  )}

                  {selectedLog.equipment_used && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Equipment Used</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.equipment_used}
                      </p>
                    </div>
                  )}

                  {selectedLog.delays_issues && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Delays / Issues</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.delays_issues}
                      </p>
                    </div>
                  )}

                  {selectedLog.safety_incidents && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <h5 className="font-medium">Safety Incident</h5>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedLog.safety_incidents}
                      </p>
                    </div>
                  )}

                  {selectedLog.visitor_log && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Visitors</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.visitor_log}
                      </p>
                    </div>
                  )}

                  {selectedLog.notes && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Notes</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLog.notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  );
};

export default DailyLogsPage;
