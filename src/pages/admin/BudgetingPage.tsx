import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Trash2
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const categoryOptions = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'other', label: 'Other' },
];

const BudgetingPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [budgetLineItems, setBudgetLineItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    project_id: '',
    total_budget: '',
    contingency_percent: '10',
    profit_margin_percent: '15',
  });

  const [newLineItem, setNewLineItem] = useState({
    category: '',
    cost_code: '',
    description: '',
    estimated_quantity: '',
    unit: '',
    unit_cost: '',
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['project-budgets', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          projects:project_id(name, client_id, clients(full_name)),
          budget_line_items(id, category, estimated_total, actual_total)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-budgets', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  // Fetch line items for selected budget
  const { data: lineItems } = useQuery({
    queryKey: ['budget-line-items', selectedBudget?.id],
    queryFn: async () => {
      if (!selectedBudget?.id) return [];
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .eq('budget_id', selectedBudget.id)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBudget?.id,
  });

  // Fetch job costs for selected budget's project
  const { data: jobCosts } = useQuery({
    queryKey: ['job-costs', selectedBudget?.project_id],
    queryFn: async () => {
      if (!selectedBudget?.project_id) return [];
      const { data, error } = await supabase
        .from('job_costs')
        .select('*')
        .eq('project_id', selectedBudget.project_id)
        .order('cost_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBudget?.project_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('project_budgets').insert({
        company_id: effectiveCompanyId,
        project_id: data.project_id,
        total_budget: data.total_budget ? parseFloat(data.total_budget) : 0,
        contingency_percent: data.contingency_percent ? parseFloat(data.contingency_percent) : 10,
        profit_margin_percent: data.profit_margin_percent ? parseFloat(data.profit_margin_percent) : 15,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Budget created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('A budget already exists for this project');
      } else {
        toast.error('Failed to create budget');
      }
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const { count } = await supabase
        .from('budget_line_items')
        .select('*', { count: 'exact', head: true })
        .eq('budget_id', selectedBudget.id);

      const estimatedTotal = (parseFloat(data.estimated_quantity) || 0) * (parseFloat(data.unit_cost) || 0);

      const { error } = await supabase.from('budget_line_items').insert({
        budget_id: selectedBudget.id,
        category: data.category,
        cost_code: data.cost_code,
        description: data.description,
        estimated_quantity: data.estimated_quantity ? parseFloat(data.estimated_quantity) : null,
        unit: data.unit,
        unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : null,
        estimated_total: estimatedTotal,
        sort_order: (count || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Line item added');
      setNewLineItem({ category: '', cost_code: '', description: '', estimated_quantity: '', unit: '', unit_cost: '' });
    },
    onError: () => toast.error('Failed to add line item'),
  });

  const resetForm = () => {
    setFormData({
      project_id: '',
      total_budget: '',
      contingency_percent: '10',
      profit_margin_percent: '15',
    });
  };

  const filteredBudgets = budgets?.filter(budget => {
    const matchesSearch = budget.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  const getBudgetProgress = (budget: any) => {
    const items = budget.budget_line_items || [];
    const totalEstimated = items.reduce((sum: number, i: any) => sum + (i.estimated_total || 0), 0);
    const totalActual = items.reduce((sum: number, i: any) => sum + (i.actual_total || 0), 0);
    if (totalEstimated === 0) return 0;
    return Math.min((totalActual / totalEstimated) * 100, 100);
  };

  const getVariance = (budget: any) => {
    const items = budget.budget_line_items || [];
    const totalEstimated = items.reduce((sum: number, i: any) => sum + (i.estimated_total || 0), 0);
    const totalActual = items.reduce((sum: number, i: any) => sum + (i.actual_total || 0), 0);
    return totalEstimated - totalActual;
  };

  const totalBudgeted = budgets?.reduce((sum, b) => sum + (b.total_budget || 0), 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => {
    const items = b.budget_line_items || [];
    return sum + items.reduce((s: number, i: any) => s + (i.actual_total || 0), 0);
  }, 0) || 0;

  const stats = [
    { title: 'Total Budgeted', value: `$${totalBudgeted.toLocaleString()}`, icon: Calculator, color: 'text-blue-500' },
    { title: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
    { title: 'Remaining', value: `$${(totalBudgeted - totalSpent).toLocaleString()}`, icon: TrendingUp, color: 'text-purple-500' },
    { title: 'Over Budget', value: budgets?.filter(b => getVariance(b) < 0).length || 0, icon: AlertTriangle, color: 'text-red-500' },
  ];

  // Calculate line item totals
  const lineItemTotalEstimated = lineItems?.reduce((sum, i) => sum + (i.estimated_total || 0), 0) || 0;
  const lineItemTotalActual = lineItems?.reduce((sum, i) => sum + (i.actual_total || 0), 0) || 0;
  const lineItemVariance = lineItemTotalEstimated - lineItemTotalActual;

  return (
    <FeatureGate featureKey="basic_budgeting" showUpgradePrompt featureName="Budgeting & Job Costing">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Budgeting & Job Costing</h1>
            <p className="text-muted-foreground">Track project budgets and actual costs</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Budget
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

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search budgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            const variance = getVariance(budget);
            const items = budget.budget_line_items || [];
            const totalEstimated = items.reduce((sum: number, i: any) => sum + (i.estimated_total || 0), 0);
            const totalActual = items.reduce((sum: number, i: any) => sum + (i.actual_total || 0), 0);

            return (
              <Card 
                key={budget.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedBudget(budget)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{budget.projects?.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {budget.projects?.clients?.full_name}
                      </p>
                    </div>
                    <Badge className={budget.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}>
                      {budget.status || 'Draft'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">${(budget.total_budget || 0).toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Spent: ${totalActual.toLocaleString()}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className={`flex items-center gap-1 text-sm ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>${Math.abs(variance).toLocaleString()} {variance >= 0 ? 'under' : 'over'} budget</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBudgets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No budgets found. Create a budget for your projects to track costs.
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Project Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="space-y-4 py-4">
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
                  <Label>Total Budget ($)</Label>
                  <Input
                    type="number"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contingency (%)</Label>
                    <Input
                      type="number"
                      value={formData.contingency_percent}
                      onChange={(e) => setFormData({ ...formData, contingency_percent: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Profit Margin (%)</Label>
                    <Input
                      type="number"
                      value={formData.profit_margin_percent}
                      onChange={(e) => setFormData({ ...formData, profit_margin_percent: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.project_id}>
                  {createMutation.isPending ? 'Creating...' : 'Create Budget'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedBudget} onOpenChange={() => setSelectedBudget(null)}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            {selectedBudget && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedBudget.projects?.name} - Budget</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-lg font-bold">${(selectedBudget.total_budget || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Spent</p>
                      <p className="text-lg font-bold">${lineItemTotalActual.toLocaleString()}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${lineItemVariance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p className={`text-lg font-bold ${lineItemVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(lineItemVariance).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Add Line Item */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Add Budget Line Item</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={newLineItem.category}
                          onValueChange={(v) => setNewLineItem({ ...newLineItem, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Cost Code"
                          value={newLineItem.cost_code}
                          onChange={(e) => setNewLineItem({ ...newLineItem, cost_code: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="Description *"
                        value={newLineItem.description}
                        onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={newLineItem.estimated_quantity}
                          onChange={(e) => setNewLineItem({ ...newLineItem, estimated_quantity: e.target.value })}
                        />
                        <Input
                          placeholder="Unit"
                          value={newLineItem.unit}
                          onChange={(e) => setNewLineItem({ ...newLineItem, unit: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Unit Cost"
                          value={newLineItem.unit_cost}
                          onChange={(e) => setNewLineItem({ ...newLineItem, unit_cost: e.target.value })}
                        />
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => addLineItemMutation.mutate(newLineItem)}
                        disabled={!newLineItem.description || !newLineItem.category || addLineItemMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Line Item
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Line Items Table */}
                  <div>
                    <h4 className="font-medium mb-3">Budget Line Items ({lineItems?.length || 0})</h4>
                    <div className="space-y-2">
                      {lineItems?.map((item) => {
                        const itemVariance = (item.estimated_total || 0) - (item.actual_total || 0);
                        return (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{categoryOptions.find(c => c.value === item.category)?.label}</Badge>
                                  {item.cost_code && <span className="text-xs font-mono text-muted-foreground">{item.cost_code}</span>}
                                </div>
                                <p className="text-sm mt-1">{item.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">${(item.estimated_total || 0).toLocaleString()}</p>
                                <p className={`text-xs ${itemVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Actual: ${(item.actual_total || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(!lineItems || lineItems.length === 0) && (
                        <p className="text-center py-8 text-muted-foreground">No line items yet</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Job Costs */}
                  {jobCosts && jobCosts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Recent Job Costs</h4>
                      <div className="space-y-2">
                        {jobCosts.slice(0, 5).map((cost) => (
                          <div key={cost.id} className="flex justify-between items-center p-2 border rounded text-sm">
                            <div>
                              <p>{cost.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(cost.cost_date), 'MMM d, yyyy')} • {cost.vendor_supplier}
                              </p>
                            </div>
                            <p className="font-medium">${(cost.total_cost || 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
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

export default BudgetingPage;
