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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Palette,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  ShoppingCart
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500' },
  selected: { label: 'Selected', color: 'bg-blue-500/10 text-blue-500' },
  ordered: { label: 'Ordered', color: 'bg-purple-500/10 text-purple-500' },
  installed: { label: 'Installed', color: 'bg-green-500/10 text-green-500' },
};

const categoryOptions = [
  { value: 'flooring', label: 'Flooring' },
  { value: 'countertops', label: 'Countertops' },
  { value: 'cabinets', label: 'Cabinets' },
  { value: 'fixtures', label: 'Fixtures' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'paint', label: 'Paint' },
  { value: 'tile', label: 'Tile' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'windows_doors', label: 'Windows & Doors' },
  { value: 'other', label: 'Other' },
];

const SelectionsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    project_id: '',
    client_id: '',
    category: '',
    item_name: '',
    description: '',
    allowance_amount: '',
    vendor: '',
    due_date: '',
    notes: '',
  });

  const { data: selections, isLoading } = useQuery({
    queryKey: ['selections', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('selections')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-selections', effectiveCompanyId],
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('selections').insert({
        company_id: effectiveCompanyId,
        project_id: data.project_id,
        client_id: data.client_id || null,
        category: data.category,
        item_name: data.item_name,
        description: data.description,
        allowance_amount: data.allowance_amount ? parseFloat(data.allowance_amount) : null,
        vendor: data.vendor,
        due_date: data.due_date || null,
        notes: data.notes,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      toast.success('Selection item created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create selection'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const updateData: any = { ...updates };
      if (updates.selected_amount !== undefined) {
        updateData.variance = (updates.allowance_amount || 0) - (updates.selected_amount || 0);
      }
      if (updates.status === 'selected') {
        updateData.selected_at = new Date().toISOString();
      }
      if (updates.status === 'ordered') {
        updateData.ordered_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('selections')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      toast.success('Selection updated');
    },
    onError: () => toast.error('Failed to update selection'),
  });

  const resetForm = () => {
    setFormData({
      project_id: '',
      client_id: '',
      category: '',
      item_name: '',
      description: '',
      allowance_amount: '',
      vendor: '',
      due_date: '',
      notes: '',
    });
  };

  const filteredSelections = selections?.filter(sel => {
    const matchesSearch = sel.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sel.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || sel.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || sel.project_id === projectFilter;
    return matchesSearch && matchesCategory && matchesProject;
  }) || [];

  const totalAllowance = selections?.reduce((sum, s) => sum + (s.allowance_amount || 0), 0) || 0;
  const totalSelected = selections?.reduce((sum, s) => sum + (s.selected_amount || 0), 0) || 0;
  const totalVariance = totalAllowance - totalSelected;
  const pendingCount = selections?.filter(s => s.status === 'pending').length || 0;

  const stats = [
    { title: 'Total Allowances', value: `$${totalAllowance.toLocaleString()}`, icon: DollarSign, color: 'text-blue-500' },
    { title: 'Total Selected', value: `$${totalSelected.toLocaleString()}`, icon: ShoppingCart, color: 'text-purple-500' },
    { title: 'Variance', value: `$${Math.abs(totalVariance).toLocaleString()}`, icon: totalVariance >= 0 ? TrendingUp : TrendingDown, color: totalVariance >= 0 ? 'text-green-500' : 'text-red-500' },
    { title: 'Pending', value: pendingCount, icon: Clock, color: 'text-yellow-500' },
  ];

  return (
    <FeatureGate featureKey="selections_allowances" showUpgradePrompt featureName="Selections & Allowances">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Selections & Allowances</h1>
            <p className="text-muted-foreground">Track client selections and manage allowances</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Selection
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
              placeholder="Search selections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSelections.map((sel) => {
            const variance = (sel.allowance_amount || 0) - (sel.selected_amount || 0);
            const progress = sel.allowance_amount ? ((sel.selected_amount || 0) / sel.allowance_amount) * 100 : 0;
            
            return (
              <Card 
                key={sel.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedItem(sel)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {categoryOptions.find(c => c.value === sel.category)?.label}
                      </Badge>
                      <h3 className="font-medium">{sel.item_name}</h3>
                      <p className="text-sm text-muted-foreground">{sel.projects?.name}</p>
                    </div>
                    <Badge className={statusConfig[sel.status]?.color}>
                      {statusConfig[sel.status]?.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Allowance</span>
                      <span className="font-medium">${(sel.allowance_amount || 0).toLocaleString()}</span>
                    </div>
                    {sel.selected_amount !== null && (
                      <>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Selected</span>
                          <span className={`font-medium ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${(sel.selected_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {sel.due_date && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Due {format(new Date(sel.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredSelections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No selections found
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Selection Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Project *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(v) => {
                      const project = projects?.find(p => p.id === v);
                      setFormData({ 
                        ...formData, 
                        project_id: v,
                        client_id: project?.client_id || ''
                      });
                    }}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Allowance ($)</Label>
                    <Input
                      type="number"
                      value={formData.allowance_amount}
                      onChange={(e) => setFormData({ ...formData, allowance_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                    placeholder="e.g., Kitchen Countertops"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vendor</Label>
                    <Input
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.project_id || !formData.category || !formData.item_name}>
                  {createMutation.isPending ? 'Adding...' : 'Add Selection'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedItem && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedItem.item_name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="flex gap-2">
                    <Badge className={statusConfig[selectedItem.status]?.color}>
                      {statusConfig[selectedItem.status]?.label}
                    </Badge>
                    <Badge variant="outline">
                      {categoryOptions.find(c => c.value === selectedItem.category)?.label}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">{selectedItem.projects?.name}</p>
                    {selectedItem.clients?.full_name && (
                      <p className="text-sm text-muted-foreground">Client: {selectedItem.clients.full_name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Allowance</p>
                      <p className="text-lg font-bold">${(selectedItem.allowance_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Selected</p>
                      <p className="text-lg font-bold">${(selectedItem.selected_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedItem.allowance_amount && selectedItem.selected_amount !== null && (
                    <div className={`p-4 rounded-lg ${(selectedItem.allowance_amount - selectedItem.selected_amount) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center gap-2">
                        {(selectedItem.allowance_amount - selectedItem.selected_amount) >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${(selectedItem.allowance_amount - selectedItem.selected_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(selectedItem.allowance_amount - selectedItem.selected_amount).toLocaleString()}
                          {(selectedItem.allowance_amount - selectedItem.selected_amount) >= 0 ? ' under' : ' over'} budget
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Record Selection */}
                  {selectedItem.status === 'pending' && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Record Selection</h4>
                      <div>
                        <Label>Selected Amount ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              updateMutation.mutate({
                                id: selectedItem.id,
                                updates: {
                                  selected_amount: parseFloat(value),
                                  allowance_amount: selectedItem.allowance_amount,
                                  status: 'selected'
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Update Status */}
                  {selectedItem.status !== 'pending' && (
                    <div>
                      <Label>Update Status</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <Button
                            key={key}
                            variant={selectedItem.status === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: selectedItem.id, updates: { status: key } })}
                          >
                            {config.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                  )}

                  {selectedItem.product_details && (
                    <div>
                      <h4 className="font-medium mb-2">Product Details</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.product_details}</p>
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

export default SelectionsPage;
