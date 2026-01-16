import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  FileSignature,
  Send,
  Eye,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', color: 'bg-blue-500/10 text-blue-500' },
  viewed: { label: 'Viewed', color: 'bg-yellow-500/10 text-yellow-500' },
  signed: { label: 'Signed', color: 'bg-green-500/10 text-green-500' },
  executed: { label: 'Executed', color: 'bg-emerald-500/10 text-emerald-500' },
  expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

const contractTypeOptions = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'time_and_materials', label: 'Time & Materials' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'unit_price', label: 'Unit Price' },
];

const ContractsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showSignature, setShowSignature] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    client_id: '',
    contract_type: '',
    amount: '',
    start_date: '',
    end_date: '',
    terms_and_conditions: '',
    scope_of_work: '',
    payment_terms: '',
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name, email)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-contracts', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-for-contracts', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, email')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const generateContractNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', effectiveCompanyId);
    return `CTR-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const contractNumber = await generateContractNumber();
      const { error } = await supabase.from('contracts').insert({
        company_id: effectiveCompanyId,
        contract_number: contractNumber,
        title: data.title,
        description: data.description,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        contract_type: data.contract_type,
        amount: data.amount ? parseFloat(data.amount) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        terms_and_conditions: data.terms_and_conditions,
        scope_of_work: data.scope_of_work,
        payment_terms: data.payment_terms,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create contract'),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract sent to client');
      setSelectedContract(null);
    },
    onError: () => toast.error('Failed to send contract'),
  });

  const signMutation = useMutation({
    mutationFn: async ({ id, signatureUrl }: { id: string; signatureUrl: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: 'signed', 
          signed_at: new Date().toISOString(),
          company_signature_url: signatureUrl,
          company_signed_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract signed');
      setShowSignature(false);
      setSelectedContract(null);
    },
    onError: () => toast.error('Failed to sign contract'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      client_id: '',
      contract_type: '',
      amount: '',
      start_date: '',
      end_date: '',
      terms_and_conditions: '',
      scope_of_work: '',
      payment_terms: '',
    });
  };

  const filteredContracts = contracts?.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = [
    { title: 'Total', value: contracts?.length || 0, icon: FileSignature, color: 'text-blue-500' },
    { title: 'Pending', value: contracts?.filter(c => c.status === 'sent' || c.status === 'viewed').length || 0, icon: Clock, color: 'text-yellow-500' },
    { title: 'Signed', value: contracts?.filter(c => c.status === 'signed' || c.status === 'executed').length || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Total Value', value: `$${(contracts?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
  ];

  return (
    <FeatureGate featureKey="contracts_esign" showUpgradePrompt featureName="Contracts & eSignature">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
            <p className="text-muted-foreground">Create and manage contracts with eSignature</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
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
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Contract</th>
                    <th className="p-4 font-medium">Client</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{contract.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{contract.contract_number}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{contract.clients?.full_name || '-'}</td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {contractTypeOptions.find(t => t.value === contract.contract_type)?.label || contract.contract_type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={statusConfig[contract.status]?.color}>
                          {statusConfig[contract.status]?.label}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium">
                        {contract.amount ? `$${contract.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(contract.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredContracts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No contracts found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Contract</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Contract title"
                  />
                </div>
                <div>
                  <Label>Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
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
                  <Label>Contract Type</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Scope of Work</Label>
                  <Textarea
                    value={formData.scope_of_work}
                    onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                    rows={4}
                    placeholder="Describe the scope of work..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Payment Terms</Label>
                  <Textarea
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    rows={2}
                    placeholder="Payment schedule and terms..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    rows={4}
                    placeholder="Contract terms and conditions..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Contract'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedContract && !showSignature} onOpenChange={() => setSelectedContract(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedContract && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedContract.contract_number}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <Badge className={statusConfig[selectedContract.status]?.color}>
                    {statusConfig[selectedContract.status]?.label}
                  </Badge>

                  <div>
                    <h3 className="font-medium text-lg">{selectedContract.title}</h3>
                    {selectedContract.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedContract.description}</p>
                    )}
                  </div>

                  {selectedContract.amount && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Contract Value</p>
                      <p className="text-2xl font-bold">${selectedContract.amount.toLocaleString()}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedContract.clients?.full_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Client</span>
                        <span>{selectedContract.clients.full_name}</span>
                      </div>
                    )}
                    {selectedContract.contract_type && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span>{contractTypeOptions.find(t => t.value === selectedContract.contract_type)?.label}</span>
                      </div>
                    )}
                    {selectedContract.start_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span>
                          {format(new Date(selectedContract.start_date), 'MMM d, yyyy')}
                          {selectedContract.end_date && ` - ${format(new Date(selectedContract.end_date), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedContract.scope_of_work && (
                    <div>
                      <h4 className="font-medium mb-2">Scope of Work</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedContract.scope_of_work}</p>
                    </div>
                  )}

                  {selectedContract.status === 'draft' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowSignature(true)}
                      >
                        <FileSignature className="h-4 w-4 mr-2" />
                        Sign
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => sendMutation.mutate(selectedContract.id)}
                        disabled={sendMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send to Client
                      </Button>
                    </div>
                  )}

                  {selectedContract.signed_at && (
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Contract Signed</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        on {format(new Date(selectedContract.signed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {selectedContract.company_signature_url && (
                        <img 
                          src={selectedContract.company_signature_url} 
                          alt="Signature" 
                          className="mt-2 max-h-16 border rounded"
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Signature Dialog */}
        <Dialog open={showSignature} onOpenChange={setShowSignature}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Contract</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <SignaturePad
                onSave={(signatureUrl) => {
                  if (selectedContract) {
                    signMutation.mutate({ id: selectedContract.id, signatureUrl });
                  }
                }}
                onCancel={() => setShowSignature(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
};

export default ContractsPage;
