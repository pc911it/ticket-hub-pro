import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building
} from 'lucide-react';
import { format, differenceInDays, isPast, isFuture, addDays } from 'date-fns';
import { CreatePermitDialog } from '@/components/permits/CreatePermitDialog';
import { PermitDetailSheet } from '@/components/permits/PermitDetailSheet';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  renewal_required: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const permitTypes = [
  'Building Permit',
  'Electrical Permit',
  'Plumbing Permit',
  'Mechanical Permit',
  'Fire Permit',
  'Demolition Permit',
  'Grading Permit',
  'Occupancy Permit',
  'Special Use Permit',
  'Other',
];

export default function PermitsPage() {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<any>(null);

  const { data: permits, isLoading } = useQuery({
    queryKey: ['permits', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permits')
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

  const filteredPermits = permits?.filter(permit => {
    const matchesSearch = 
      permit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.permit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.issuing_authority?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || permit.status === statusFilter;
    const matchesType = typeFilter === 'all' || permit.permit_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  // Check for expiring/expired permits
  const expiringPermits = permits?.filter(p => {
    if (!p.expiration_date) return false;
    const daysUntilExpiry = differenceInDays(new Date(p.expiration_date), new Date());
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }) || [];

  const expiredPermits = permits?.filter(p => {
    if (!p.expiration_date) return false;
    return isPast(new Date(p.expiration_date));
  }) || [];

  const stats = {
    total: permits?.length || 0,
    active: permits?.filter(p => p.status === 'issued' || p.status === 'approved').length || 0,
    pending: permits?.filter(p => p.status === 'pending' || p.status === 'submitted').length || 0,
    expiringSoon: expiringPermits.length,
    expired: expiredPermits.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Permits</h1>
          <p className="text-muted-foreground">Track permits, inspections, and renewals</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Permit
        </Button>
      </div>

      {/* Alerts */}
      {(expiringPermits.length > 0 || expiredPermits.length > 0) && (
        <div className="space-y-2">
          {expiredPermits.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{expiredPermits.length} permit(s) have expired</span>
            </div>
          )}
          {expiringPermits.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{expiringPermits.length} permit(s) expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Permits</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permits..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {permitTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permits List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPermits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No permits found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first permit to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Permit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPermits.map((permit) => {
            const isExpired = permit.expiration_date && isPast(new Date(permit.expiration_date));
            const isExpiringSoon = permit.expiration_date && 
              differenceInDays(new Date(permit.expiration_date), new Date()) <= 30 &&
              differenceInDays(new Date(permit.expiration_date), new Date()) > 0;

            return (
              <Card 
                key={permit.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  isExpired ? 'border-destructive' : isExpiringSoon ? 'border-orange-500' : ''
                }`}
                onClick={() => setSelectedPermit(permit)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-muted-foreground">
                          {permit.permit_number}
                        </span>
                        <Badge className={statusColors[permit.status] || ''}>
                          {permit.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline">{permit.permit_type}</Badge>
                        {isExpired && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {isExpiringSoon && (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{permit.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {permit.project && (
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {permit.project.name}
                          </span>
                        )}
                        {permit.issuing_authority && (
                          <span>Authority: {permit.issuing_authority}</span>
                        )}
                        {permit.fee_amount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${permit.fee_amount.toFixed(2)}
                            {permit.fee_paid && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right space-y-1">
                      {permit.expiration_date && (
                        <div className={`flex items-center gap-1 justify-end ${
                          isExpired ? 'text-destructive' : isExpiringSoon ? 'text-orange-500' : ''
                        }`}>
                          <Calendar className="h-4 w-4" />
                          Expires: {format(new Date(permit.expiration_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      {permit.issue_date && (
                        <div>Issued: {format(new Date(permit.issue_date), 'MMM d, yyyy')}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreatePermitDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        companyId={effectiveCompanyId}
      />

      <PermitDetailSheet
        permit={selectedPermit}
        open={!!selectedPermit}
        onOpenChange={(open) => !open && setSelectedPermit(null)}
      />
    </div>
  );
}
