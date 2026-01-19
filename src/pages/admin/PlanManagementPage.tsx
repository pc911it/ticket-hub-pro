import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Settings, 
  DollarSign, 
  Percent, 
  Calendar, 
  Save, 
  Plus, 
  Edit2, 
  Star,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Tag,
  Clock
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  is_custom_pricing: boolean;
  is_popular: boolean;
  is_active: boolean;
  trial_days: number;
  sort_order: number;
  discount_percent: number | null;
  discount_fixed_amount: number | null;
  discount_label: string | null;
  discount_valid_until: string | null;
}

interface PricingSettings {
  id: string;
  yearly_discount_percent: number;
  default_trial_days: number;
  payment_processing_fee_percent: number;
  payment_processing_fee_fixed: number;
  allow_monthly_billing: boolean;
  allow_yearly_billing: boolean;
}

export default function PlanManagementPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Redirect non-super-admins
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Plan Management is only available to Super Administrators.
        </p>
      </div>
    );
  }

  // Fetch subscription plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Fetch pricing settings
  const { data: pricingSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as PricingSettings;
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan> & { id: string }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update(plan)
        .eq('id', plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan updated successfully');
      setEditingPlan(null);
    },
    onError: (error) => {
      toast.error('Failed to update plan: ' + error.message);
    },
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id'> & { id: string }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .insert(plan);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create plan: ' + error.message);
    },
  });

  // Update pricing settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<PricingSettings>) => {
      if (!pricingSettings?.id) return;
      const { error } = await supabase
        .from('pricing_settings')
        .update(settings)
        .eq('id', pricingSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const PlanEditForm = ({ plan, onSave, onCancel }: { 
    plan: SubscriptionPlan | null; 
    onSave: (plan: any) => void; 
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      id: plan?.id || '',
      name: plan?.name || '',
      description: plan?.description || '',
      monthly_price: plan ? plan.monthly_price / 100 : 0,
      yearly_price: plan ? plan.yearly_price / 100 : 0,
      is_custom_pricing: plan?.is_custom_pricing || false,
      is_popular: plan?.is_popular || false,
      is_active: plan?.is_active ?? true,
      trial_days: plan?.trial_days || 14,
      sort_order: plan?.sort_order || 0,
      discount_percent: plan?.discount_percent || 0,
      discount_fixed_amount: plan ? (plan.discount_fixed_amount || 0) / 100 : 0,
      discount_label: plan?.discount_label || '',
      discount_valid_until: plan?.discount_valid_until ? plan.discount_valid_until.split('T')[0] : '',
    });

    const hasDiscount = formData.discount_percent > 0 || formData.discount_fixed_amount > 0;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...formData,
        monthly_price: Math.round(formData.monthly_price * 100),
        yearly_price: Math.round(formData.yearly_price * 100),
        discount_fixed_amount: Math.round(formData.discount_fixed_amount * 100),
        discount_label: formData.discount_label || null,
        discount_valid_until: formData.discount_valid_until ? new Date(formData.discount_valid_until).toISOString() : null,
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="id">Plan ID</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              placeholder="e.g., professional"
              disabled={!!plan}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Professional"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the plan"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly_price">Monthly Price ($)</Label>
            <Input
              id="monthly_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.monthly_price}
              onChange={(e) => setFormData(prev => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))}
              disabled={formData.is_custom_pricing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearly_price">Yearly Price ($)</Label>
            <Input
              id="yearly_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.yearly_price}
              onChange={(e) => setFormData(prev => ({ ...prev, yearly_price: parseFloat(e.target.value) || 0 }))}
              disabled={formData.is_custom_pricing}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trial_days">Trial Days</Label>
            <Input
              id="trial_days"
              type="number"
              min="0"
              value={formData.trial_days}
              onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>

        {/* Discount Section */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-600" />
            <Label className="font-semibold">Plan Discount</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_percent">Discount Percentage (%)</Label>
              <Input
                id="discount_percent"
                type="number"
                min="0"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                disabled={formData.is_custom_pricing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_fixed_amount">Fixed Discount ($)</Label>
              <Input
                id="discount_fixed_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.discount_fixed_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_fixed_amount: parseFloat(e.target.value) || 0 }))}
                disabled={formData.is_custom_pricing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_label">Discount Label</Label>
              <Input
                id="discount_label"
                value={formData.discount_label}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_label: e.target.value }))}
                placeholder="e.g., Summer Sale, Early Bird"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_valid_until">Valid Until</Label>
              <Input
                id="discount_valid_until"
                type="date"
                value={formData.discount_valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_valid_until: e.target.value }))}
              />
            </div>
          </div>

          {hasDiscount && !formData.is_custom_pricing && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Original Monthly:</span>
                <span className="line-through">${formData.monthly_price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Discounted Monthly:</span>
                <span className="text-lg font-bold text-green-600">
                  ${(formData.monthly_price * (1 - formData.discount_percent / 100) - formData.discount_fixed_amount).toFixed(2)}
                </span>
              </div>
              {formData.discount_label && (
                <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100">
                  {formData.discount_label}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_popular"
              checked={formData.is_popular}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
            />
            <Label htmlFor="is_popular">Popular Badge</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_custom_pricing"
              checked={formData.is_custom_pricing}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_custom_pricing: checked }))}
            />
            <Label htmlFor="is_custom_pricing">Custom Pricing (Contact Sales)</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Plan
          </Button>
        </div>
      </form>
    );
  };

  if (plansLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Plan Management
          </h1>
          <p className="text-muted-foreground">
            Configure subscription plans, pricing, and billing settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription Plans
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Plan</DialogTitle>
                  <DialogDescription>Add a new subscription plan to your pricing</DialogDescription>
                </DialogHeader>
                <PlanEditForm
                  plan={null}
                  onSave={(plan) => createPlanMutation.mutate(plan)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const hasDiscount = Boolean((plan.discount_percent && plan.discount_percent > 0) || 
                                 (plan.discount_fixed_amount && plan.discount_fixed_amount > 0));
              const discountedMonthly = plan.monthly_price * (1 - (plan.discount_percent || 0) / 100) - (plan.discount_fixed_amount || 0);
              const isDiscountValid = !plan.discount_valid_until || new Date(plan.discount_valid_until) > new Date();
              
              return (
                <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
                  {plan.is_popular && (
                    <Badge className="absolute -top-2 -right-2 bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {hasDiscount && isDiscountValid && (
                    <Badge className="absolute -top-2 left-4 bg-green-600">
                      <Tag className="h-3 w-3 mr-1" />
                      {plan.discount_label || (plan.discount_percent && plan.discount_percent > 0 ? `${plan.discount_percent}% OFF` : `$${(plan.discount_fixed_amount || 0) / 100} OFF`)}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {plan.name}
                        {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.is_custom_pricing ? (
                      <div className="text-2xl font-bold">Custom Pricing</div>
                    ) : (
                      <div className="space-y-1">
                        {hasDiscount && isDiscountValid ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-green-600">${formatPrice(Math.max(0, discountedMonthly))}</span>
                              <span className="text-lg line-through text-muted-foreground">${formatPrice(plan.monthly_price)}</span>
                              <span className="text-muted-foreground">/month</span>
                            </div>
                            {plan.discount_valid_until && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <Clock className="h-3 w-3" />
                                Expires {new Date(plan.discount_valid_until).toLocaleDateString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">${formatPrice(plan.monthly_price)}</span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          or ${formatPrice(plan.yearly_price)}/year
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {plan.trial_days} day trial
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Plans Table for Quick View */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Yearly</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => {
                    const hasDiscount = Boolean((plan.discount_percent && plan.discount_percent > 0) || 
                                       (plan.discount_fixed_amount && plan.discount_fixed_amount > 0));
                    const isDiscountValid = !plan.discount_valid_until || new Date(plan.discount_valid_until) > new Date();
                    
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          {plan.name}
                          {plan.is_popular && <Badge className="ml-2" variant="secondary">Popular</Badge>}
                        </TableCell>
                        <TableCell>
                          {plan.is_custom_pricing ? 'Custom' : `$${formatPrice(plan.monthly_price)}`}
                        </TableCell>
                        <TableCell>
                          {plan.is_custom_pricing ? 'Custom' : `$${formatPrice(plan.yearly_price)}`}
                        </TableCell>
                        <TableCell>
                          {hasDiscount && isDiscountValid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Tag className="h-3 w-3 mr-1" />
                              {plan.discount_percent ? `${plan.discount_percent}%` : `$${formatPrice(plan.discount_fixed_amount || 0)}`}
                              {plan.discount_label && ` (${plan.discount_label})`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{plan.trial_days} days</TableCell>
                        <TableCell>
                          <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Plan Dialog */}
          <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
                <DialogDescription>Update plan details and pricing</DialogDescription>
              </DialogHeader>
              {editingPlan && (
                <PlanEditForm
                  plan={editingPlan}
                  onSave={(plan) => updatePlanMutation.mutate(plan)}
                  onCancel={() => setEditingPlan(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {pricingSettings && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Billing Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing Options
                  </CardTitle>
                  <CardDescription>Configure billing cycles and options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Monthly Billing</Label>
                      <p className="text-sm text-muted-foreground">Enable monthly subscription option</p>
                    </div>
                    <Switch
                      checked={pricingSettings.allow_monthly_billing}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ allow_monthly_billing: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Yearly Billing</Label>
                      <p className="text-sm text-muted-foreground">Enable yearly subscription option</p>
                    </div>
                    <Switch
                      checked={pricingSettings.allow_yearly_billing}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ allow_yearly_billing: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Discounts & Trials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Discounts & Trials
                  </CardTitle>
                  <CardDescription>Configure default discounts and trial periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="yearly_discount">Yearly Discount Display (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="yearly_discount"
                        type="number"
                        min="0"
                        max="100"
                        value={pricingSettings.yearly_discount_percent}
                        onChange={(e) => 
                          updateSettingsMutation.mutate({ 
                            yearly_discount_percent: parseInt(e.target.value) || 0 
                          })
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground">% shown as "Save up to X%"</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_trial">Default Trial Period (days)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="default_trial"
                        type="number"
                        min="0"
                        value={pricingSettings.default_trial_days}
                        onChange={(e) => 
                          updateSettingsMutation.mutate({ 
                            default_trial_days: parseInt(e.target.value) || 0 
                          })
                        }
                        className="w-24"
                      />
                      <span className="text-muted-foreground">days for new signups</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Processing */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Processing Fees
                  </CardTitle>
                  <CardDescription>
                    These fees are displayed to users when billing clients (informational only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fee_percent">Percentage Fee (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="fee_percent"
                          type="number"
                          step="0.1"
                          min="0"
                          value={pricingSettings.payment_processing_fee_percent}
                          onChange={(e) => 
                            updateSettingsMutation.mutate({ 
                              payment_processing_fee_percent: parseFloat(e.target.value) || 0 
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">% per transaction</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fee_fixed">Fixed Fee (cents)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="fee_fixed"
                          type="number"
                          min="0"
                          value={pricingSettings.payment_processing_fee_fixed}
                          onChange={(e) => 
                            updateSettingsMutation.mutate({ 
                              payment_processing_fee_fixed: parseInt(e.target.value) || 0 
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-muted-foreground">¢ (e.g., 30 = $0.30)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Displayed as: {pricingSettings.payment_processing_fee_percent}% + ${(pricingSettings.payment_processing_fee_fixed / 100).toFixed(2)} per transaction
                  </p>
                </CardContent>
              </Card>

              {/* Revenue Projections */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Summary
                  </CardTitle>
                  <CardDescription>Potential revenue based on current pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Monthly Revenue (per customer)</TableHead>
                        <TableHead>Yearly Revenue (per customer)</TableHead>
                        <TableHead>Monthly Equiv. (Yearly)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.filter(p => !p.is_custom_pricing && p.is_active).map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>${formatPrice(plan.monthly_price)}</TableCell>
                          <TableCell>${formatPrice(plan.yearly_price)}</TableCell>
                          <TableCell>${formatPrice(plan.yearly_price / 12)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
