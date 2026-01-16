import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Calculator,
  DollarSign,
  Clock,
  Users,
  Trash2,
  Copy
} from 'lucide-react';

const categoryOptions = [
  { value: 'labor', label: 'Labor', icon: Users },
  { value: 'material', label: 'Material', icon: DollarSign },
  { value: 'equipment', label: 'Equipment', icon: Calculator },
];

const unitOptions = [
  'hour', 'sqft', 'linear_ft', 'each', 'cubic_yd', 'ton', 'gallon', 'sheet', 'bundle'
];

interface CalculatorItem {
  id: string;
  templateId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  laborHours: number;
  markup: number;
  total: number;
}

const CostCalculatorPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'calculator'>('calculator');
  
  // Calculator state
  const [calcItems, setCalcItems] = useState<CalculatorItem[]>([]);
  const [projectName, setProjectName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'labor',
    description: '',
    unit: 'hour',
    unit_cost: '',
    labor_hours_per_unit: '',
    crew_size: '',
    productivity_rate: '',
    markup_percent: '0',
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['cost-templates', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('cost_templates')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cost_templates').insert({
        company_id: effectiveCompanyId,
        name: data.name,
        category: data.category,
        description: data.description,
        unit: data.unit,
        unit_cost: parseFloat(data.unit_cost) || 0,
        labor_hours_per_unit: data.labor_hours_per_unit ? parseFloat(data.labor_hours_per_unit) : null,
        crew_size: data.crew_size ? parseInt(data.crew_size) : null,
        productivity_rate: data.productivity_rate ? parseFloat(data.productivity_rate) : null,
        markup_percent: parseFloat(data.markup_percent) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-templates'] });
      toast.success('Template created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create template'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-templates'] });
      toast.success('Template removed');
    },
    onError: () => toast.error('Failed to remove template'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'labor',
      description: '',
      unit: 'hour',
      unit_cost: '',
      labor_hours_per_unit: '',
      crew_size: '',
      productivity_rate: '',
      markup_percent: '0',
    });
  };

  const addItemFromTemplate = (template: any) => {
    const newItem: CalculatorItem = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      quantity: 1,
      unit: template.unit,
      unitCost: template.unit_cost,
      laborHours: template.labor_hours_per_unit || 0,
      markup: template.markup_percent || 0,
      total: template.unit_cost * (1 + (template.markup_percent || 0) / 100),
    };
    setCalcItems([...calcItems, newItem]);
  };

  const addCustomItem = () => {
    const newItem: CalculatorItem = {
      id: crypto.randomUUID(),
      name: 'Custom Item',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      laborHours: 0,
      markup: 0,
      total: 0,
    };
    setCalcItems([...calcItems, newItem]);
  };

  const updateCalcItem = (id: string, field: keyof CalculatorItem, value: any) => {
    setCalcItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate total
        const subtotal = updated.quantity * updated.unitCost;
        updated.total = subtotal * (1 + updated.markup / 100);
        return updated;
      }
      return item;
    }));
  };

  const removeCalcItem = (id: string) => {
    setCalcItems(items => items.filter(item => item.id !== id));
  };

  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const calcTotals = {
    subtotal: calcItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
    markup: calcItems.reduce((sum, item) => sum + (item.quantity * item.unitCost * item.markup / 100), 0),
    laborHours: calcItems.reduce((sum, item) => sum + (item.quantity * item.laborHours), 0),
    total: calcItems.reduce((sum, item) => sum + item.total, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cost Calculator</h1>
          <p className="text-muted-foreground">Material & labor cost templates and estimator</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="templates">Cost Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Template Selection */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add from Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {categoryOptions.map(cat => {
                  const catTemplates = templates?.filter(t => t.category === cat.value) || [];
                  if (catTemplates.length === 0) return null;
                  return (
                    <div key={cat.value}>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{cat.label}</p>
                      {catTemplates.map(t => (
                        <Button
                          key={t.id}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => addItemFromTemplate(t)}
                        >
                          <Plus className="h-4 w-4 mr-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${t.unit_cost}/{t.unit}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  );
                })}
                <Separator className="my-3" />
                <Button variant="outline" className="w-full" onClick={addCustomItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Item
                </Button>
              </CardContent>
            </Card>

            {/* Calculator */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Estimate</CardTitle>
                  <Input
                    placeholder="Project name..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-48"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {calcItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Add items from templates or create custom items
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-2">Unit Cost</div>
                      <div className="col-span-2">Markup %</div>
                      <div className="col-span-1">Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    {calcItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            value={item.name}
                            onChange={(e) => updateCalcItem(item.id, 'name', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCalcItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => updateCalcItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.markup}
                            onChange={(e) => updateCalcItem(item.id, 'markup', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 text-sm font-medium">
                          ${item.total.toFixed(2)}
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeCalcItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${calcTotals.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Markup</span>
                        <span>${calcTotals.markup.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Total Labor Hours
                        </span>
                        <span>{calcTotals.laborHours.toLocaleString()}h</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${calcTotals.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const catConfig = categoryOptions.find(c => c.value === template.category);
              const CatIcon = catConfig?.icon || Calculator;
              return (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-muted">
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {catConfig?.label}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Unit Cost</p>
                        <p className="font-medium">${template.unit_cost}/{template.unit}</p>
                      </div>
                      {template.labor_hours_per_unit && (
                        <div>
                          <p className="text-muted-foreground text-xs">Labor Hours</p>
                          <p className="font-medium">{template.labor_hours_per_unit}h/{template.unit}</p>
                        </div>
                      )}
                      {template.markup_percent > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Markup</p>
                          <p className="font-medium">{template.markup_percent}%</p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => {
                        addItemFromTemplate(template);
                        setActiveTab('calculator');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Use in Calculator
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No templates found. Create your first cost template.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Cost Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Drywall Installation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(v) => setFormData({ ...formData, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unit Cost ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Markup %</Label>
                  <Input
                    type="number"
                    value={formData.markup_percent}
                    onChange={(e) => setFormData({ ...formData, markup_percent: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Labor Hours/Unit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.labor_hours_per_unit}
                    onChange={(e) => setFormData({ ...formData, labor_hours_per_unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Crew Size</Label>
                  <Input
                    type="number"
                    value={formData.crew_size}
                    onChange={(e) => setFormData({ ...formData, crew_size: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CostCalculatorPage;
