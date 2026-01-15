import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle, DollarSign, Send, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CreateBidDialog from '@/components/bids/CreateBidDialog';
import BidDetailSheet from '@/components/bids/BidDetailSheet';

interface Bid {
  id: string;
  bid_number: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  submission_deadline: string | null;
  valid_until: string | null;
  internal_approval_status: string | null;
  client_approval_status: string | null;
  created_at: string;
  project_id: string | null;
  client_id: string | null;
  project?: { name: string } | null;
  client?: { full_name: string; email: string } | null;
}

export default function BidsPage() {
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  useEffect(() => {
    if (effectiveCompanyId) {
      fetchBids();
    }
  }, [effectiveCompanyId]);

  const fetchBids = async () => {
    if (!effectiveCompanyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          project:projects(name),
          client:clients(full_name, email)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBids(data || []);
    } catch (error: any) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      draft: { variant: 'secondary', icon: <FileText className="h-3 w-3 mr-1" /> },
      pending_approval: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
      submitted: { variant: 'default', icon: <Send className="h-3 w-3 mr-1" /> },
      won: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      lost: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const config = variants[status] || variants.draft;
    
    return (
      <Badge variant={config.variant} className={status === 'won' ? 'bg-green-500' : ''}>
        {config.icon}
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const getApprovalBadge = (internalStatus: string | null, clientStatus: string | null) => {
    if (internalStatus === 'rejected' || clientStatus === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (internalStatus === 'approved' && clientStatus === 'approved') {
      return <Badge className="bg-green-500">Fully Approved</Badge>;
    }
    if (internalStatus === 'approved') {
      return <Badge variant="outline">Internal Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const filteredBids = bids.filter(bid => {
    const matchesSearch = 
      bid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.bid_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bids.length,
    draft: bids.filter(b => b.status === 'draft').length,
    submitted: bids.filter(b => b.status === 'submitted').length,
    won: bids.filter(b => b.status === 'won').length,
    totalValue: bids.filter(b => b.status === 'won').reduce((sum, b) => sum + Number(b.amount), 0),
  };

  const handleBidClick = (bid: Bid) => {
    setSelectedBid(bid);
    setShowDetailSheet(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bid Management</h1>
          <p className="text-muted-foreground">Create, track, and manage your bids</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bid
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.won}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bids..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bids Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bids...</div>
          ) : filteredBids.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No bids found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first bid to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bid
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bid #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBids.map((bid) => (
                  <TableRow 
                    key={bid.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleBidClick(bid)}
                  >
                    <TableCell className="font-medium">{bid.bid_number}</TableCell>
                    <TableCell>{bid.title}</TableCell>
                    <TableCell>{bid.client?.full_name || '-'}</TableCell>
                    <TableCell>{bid.project?.name || '-'}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${Number(bid.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(bid.status)}</TableCell>
                    <TableCell>
                      {getApprovalBadge(bid.internal_approval_status, bid.client_approval_status)}
                    </TableCell>
                    <TableCell>
                      {bid.submission_deadline 
                        ? format(new Date(bid.submission_deadline), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleBidClick(bid);
                          }}>
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateBidDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        companyId={effectiveCompanyId}
        onSuccess={fetchBids}
      />

      {selectedBid && (
        <BidDetailSheet
          open={showDetailSheet}
          onOpenChange={setShowDetailSheet}
          bid={selectedBid}
          onUpdate={fetchBids}
        />
      )}
    </div>
  );
}
