import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateSubmittalDialog } from '@/components/submittals/CreateSubmittalDialog';
import { SubmittalDetailSheet } from '@/components/submittals/SubmittalDetailSheet';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  approved_as_noted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  resubmit: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function SubmittalsPage() {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { hasFeature } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSubmittal, setSelectedSubmittal] = useState<any>(null);

  const { data: submittals, isLoading } = useQuery({
    queryKey: ['submittals', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submittals')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  const filteredSubmittals = submittals?.filter(submittal => {
    const matchesSearch = 
      submittal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submittal.submittal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submittal.spec_section?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || submittal.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = {
    total: submittals?.length || 0,
    pending: submittals?.filter(s => s.status === 'submitted' || s.status === 'under_review').length || 0,
    approved: submittals?.filter(s => s.status === 'approved' || s.status === 'approved_as_noted').length || 0,
    rejected: submittals?.filter(s => s.status === 'rejected' || s.status === 'resubmit').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Submittals</h1>
          <p className="text-muted-foreground">Manage project submittals and approvals</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Submittal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Submittals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected/Resubmit</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submittals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="approved_as_noted">Approved as Noted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="resubmit">Resubmit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submittals List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredSubmittals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No submittals found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first submittal to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Submittal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmittals.map((submittal) => (
            <Card 
              key={submittal.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSubmittal(submittal)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">
                        {submittal.submittal_number}
                      </span>
                      <Badge className={statusColors[submittal.status] || ''}>
                        {submittal.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={priorityColors[submittal.priority] || ''}>
                        {submittal.priority}
                      </Badge>
                      {submittal.revision_number > 1 && (
                        <Badge variant="outline">Rev {submittal.revision_number}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">{submittal.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {submittal.project && (
                        <span>Project: {submittal.project.name}</span>
                      )}
                      {submittal.spec_section && (
                        <span>Spec: {submittal.spec_section}</span>
                      )}
                      {submittal.drawing_reference && (
                        <span>Drawing: {submittal.drawing_reference}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {submittal.due_date && (
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-4 w-4" />
                        Due: {format(new Date(submittal.due_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    <div className="mt-1">
                      Created: {format(new Date(submittal.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSubmittalDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        companyId={effectiveCompanyId}
      />

      <SubmittalDetailSheet
        submittal={selectedSubmittal}
        open={!!selectedSubmittal}
        onOpenChange={(open) => !open && setSelectedSubmittal(null)}
      />
    </div>
  );
}
