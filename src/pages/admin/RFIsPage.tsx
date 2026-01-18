import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Search, FileQuestion, Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { CreateRFIDialog } from '@/components/rfis/CreateRFIDialog';
import { RFIDetailSheet } from '@/components/rfis/RFIDetailSheet';

interface RFI {
  id: string;
  rfi_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  submitted_at: string | null;
  approval_status: string | null;
  created_at: string;
  project_id: string | null;
  ticket_id: string | null;
  drawing_reference: string | null;
  spec_reference: string | null;
  response: string | null;
  response_at: string | null;
  notes: string | null;
  projects?: { name: string } | null;
  tickets?: { title: string } | null;
}

export default function RFIsPage() {
  const { user } = useAuth();
  const { effectiveCompanyId, isPlatformView, isLoading: companyLoading } = useEffectiveCompanyId();
  const [rfis, setRFIs] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);

  const fetchRFIs = async () => {
    // Wait for company loading to complete
    if (companyLoading) {
      return;
    }

    // For non-platform views, we need a company ID
    if (!isPlatformView && !effectiveCompanyId) {
      setRFIs([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('rfis')
        .select(`
          *,
          projects:project_id(name),
          tickets:ticket_id(title)
        `)
        .order('created_at', { ascending: false });

      // Only filter by company if not in platform view
      if (!isPlatformView && effectiveCompanyId) {
        query = query.or(`company_id.eq.${effectiveCompanyId},partner_company_id.eq.${effectiveCompanyId}`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,rfi_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRFIs(data || []);
    } catch (error) {
      console.error('Error fetching RFIs:', error);
      toast.error('Failed to load RFIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyLoading) {
      setLoading(true);
      fetchRFIs();
    }
  }, [effectiveCompanyId, isPlatformView, companyLoading, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      draft: { variant: 'secondary', icon: <FileQuestion className="h-3 w-3" /> },
      submitted: { variant: 'default', icon: <Clock className="h-3 w-3" /> },
      under_review: { variant: 'outline', icon: <MessageSquare className="h-3 w-3" /> },
      answered: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      closed: { variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      urgent: 'destructive',
    };
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  const stats = {
    total: rfis.length,
    open: rfis.filter(r => ['draft', 'submitted', 'under_review'].includes(r.status)).length,
    answered: rfis.filter(r => r.status === 'answered').length,
    overdue: rfis.filter(r => r.due_date && new Date(r.due_date) < new Date() && r.status !== 'closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">RFI Management</h1>
          <p className="text-muted-foreground">Manage requests for information</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New RFI
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total RFIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Answered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RFIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RFI List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rfis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RFIs found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first RFI to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create RFI
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rfis.map((rfi) => (
            <Card
              key={rfi.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRFI(rfi)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{rfi.rfi_number}</span>
                      {getStatusBadge(rfi.status)}
                      {getPriorityBadge(rfi.priority)}
                      {rfi.due_date && new Date(rfi.due_date) < new Date() && rfi.status !== 'closed' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{rfi.title}</h3>
                    {rfi.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{rfi.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {rfi.projects?.name && <span>Project: {rfi.projects.name}</span>}
                      {rfi.tickets?.title && <span>Ticket: {rfi.tickets.title}</span>}
                      {rfi.due_date && <span>Due: {format(new Date(rfi.due_date), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {format(new Date(rfi.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRFIDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchRFIs();
          setCreateDialogOpen(false);
        }}
      />

      <RFIDetailSheet
        rfi={selectedRFI}
        open={!!selectedRFI}
        onOpenChange={(open) => !open && setSelectedRFI(null)}
        onUpdate={fetchRFIs}
      />
    </div>
  );
}
