import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Search, Check, X, Settings2, Sparkles, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";

interface Company {
  id: string;
  name: string;
  email: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
  limit_value: number | null;
}

interface FeatureOverride {
  id: string;
  company_id: string;
  feature_key: string;
  is_enabled: boolean;
  limit_value: number | null;
}

const ALL_FEATURES = [
  // Core Features
  { key: 'project_management', label: 'Project Management', category: 'Core' },
  { key: 'inventory_management', label: 'Inventory Management', category: 'Core' },
  { key: 'billing_management', label: 'Billing Management', category: 'Core' },
  { key: 'real_time_tracking', label: 'Real-time Tracking', category: 'Core' },
  { key: 'settings_access', label: 'Settings Access', category: 'Core' },
  
  // Sales & CRM
  { key: 'leads_management', label: 'Leads Management', category: 'Sales & CRM' },
  { key: 'bid_management', label: 'Bid Management', category: 'Sales & CRM' },
  { key: 'ai_bidding', label: 'AI Bidding', category: 'Sales & CRM' },
  { key: 'subcontractor_matching', label: 'Subcontractor Matching', category: 'Sales & CRM' },
  { key: 'follow_ups', label: 'Follow-up Reminders', category: 'Sales & CRM' },
  
  // Project Management
  { key: 'daily_logs', label: 'Daily Logs', category: 'Project Mgmt' },
  { key: 'work_orders', label: 'Work Orders', category: 'Project Mgmt' },
  { key: 'punch_lists', label: 'Punch Lists', category: 'Project Mgmt' },
  { key: 'inspections', label: 'Inspections', category: 'Project Mgmt' },
  { key: 'change_orders', label: 'Change Orders', category: 'Project Mgmt' },
  { key: 'rfi_management', label: 'RFI Management', category: 'Project Mgmt' },
  { key: 'submittal_management', label: 'Submittal Management', category: 'Project Mgmt' },
  { key: 'permit_tracking', label: 'Permit Tracking', category: 'Project Mgmt' },
  
  // Financial
  { key: 'basic_budgeting', label: 'Basic Budgeting', category: 'Financial' },
  { key: 'job_costing', label: 'Job Costing', category: 'Financial' },
  { key: 'cost_estimating', label: 'Cost Estimating', category: 'Financial' },
  
  // Documents & Design
  { key: 'contracts_esign', label: 'Contracts & eSign', category: 'Documents' },
  { key: 'floor_plans_3d', label: '3D Floor Plans', category: 'Documents' },
  { key: 'mood_boards', label: 'Mood Boards', category: 'Documents' },
  { key: 'product_library', label: 'Product Library', category: 'Documents' },
  { key: 'plan_markups', label: 'Plan Markups', category: 'Documents' },
  { key: 'ai_takeoffs', label: 'AI Takeoffs', category: 'Documents' },
  
  // Assets & Operations
  { key: 'equipment_tracking', label: 'Equipment Tracking', category: 'Operations' },
  { key: 'warranties', label: 'Warranty Tracking', category: 'Operations' },
  { key: 'selections_allowances', label: 'Selections & Allowances', category: 'Operations' },
  { key: 'site_mapping', label: 'Site Mapping', category: 'Operations' },
  { key: 'crew_dispatch', label: 'Crew Dispatch', category: 'Operations' },
  { key: 'offline_mode', label: 'Offline Mode', category: 'Operations' },
  
  // Enterprise
  { key: 'multi_company', label: 'Multi-Company', category: 'Enterprise' },
  { key: 'white_label', label: 'White Label', category: 'Enterprise' },
  { key: 'api_access', label: 'API Access', category: 'Enterprise' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', category: 'Enterprise' },
  { key: 'custom_reports', label: 'Custom Reports', category: 'Enterprise' },
  { key: 'priority_support', label: 'Priority Support', category: 'Enterprise' },
  { key: 'sla_support', label: 'SLA Support', category: 'Enterprise' },
  { key: 'dedicated_onboarding', label: 'Dedicated Onboarding', category: 'Enterprise' },
];

export default function CompanyFeaturesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, email, subscription_plan, subscription_status, trial_ends_at')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyFeatures = async (company: Company) => {
    setLoadingFeatures(true);
    try {
      // Fetch plan features
      const plan = company.subscription_plan || 'professional';
      const { data: planData, error: planError } = await supabase
        .from('plan_features')
        .select('feature_key, is_enabled, limit_value')
        .eq('plan_id', plan);

      if (planError) throw planError;
      setPlanFeatures(planData || []);

      // Fetch company overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('company_feature_overrides')
        .select('*')
        .eq('company_id', company.id);

      if (overridesError) throw overridesError;
      setOverrides(overridesData || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('Failed to load features');
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    fetchCompanyFeatures(company);
  };

  const getEffectiveFeatureStatus = (featureKey: string): { enabled: boolean; isOverridden: boolean; limit?: number | null } => {
    const override = overrides.find(o => o.feature_key === featureKey);
    if (override) {
      return { enabled: override.is_enabled, isOverridden: true, limit: override.limit_value };
    }
    const planFeature = planFeatures.find(f => f.feature_key === featureKey);
    return { enabled: planFeature?.is_enabled ?? false, isOverridden: false, limit: planFeature?.limit_value };
  };

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!selectedCompany) return;
    setSaving(true);

    try {
      const existingOverride = overrides.find(o => o.feature_key === featureKey);

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('company_feature_overrides')
          .update({ is_enabled: enabled })
          .eq('id', existingOverride.id);

        if (error) throw error;
        setOverrides(overrides.map(o => 
          o.id === existingOverride.id ? { ...o, is_enabled: enabled } : o
        ));
      } else {
        // Create new override
        const { data, error } = await supabase
          .from('company_feature_overrides')
          .insert({
            company_id: selectedCompany.id,
            feature_key: featureKey,
            is_enabled: enabled,
          })
          .select()
          .single();

        if (error) throw error;
        setOverrides([...overrides, data]);
      }

      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error('Failed to update feature');
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async (featureKey: string) => {
    if (!selectedCompany) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('company_feature_overrides')
        .delete()
        .eq('company_id', selectedCompany.id)
        .eq('feature_key', featureKey);

      if (error) throw error;
      setOverrides(overrides.filter(o => o.feature_key !== featureKey));
      toast.success('Override removed - using plan default');
    } catch (error) {
      console.error('Error removing override:', error);
      toast.error('Failed to remove override');
    } finally {
      setSaving(false);
    }
  };

  const updateSubscription = async (plan: string) => {
    if (!selectedCompany) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ subscription_plan: plan })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      setSelectedCompany({ ...selectedCompany, subscription_plan: plan });
      setCompanies(companies.map(c => 
        c.id === selectedCompany.id ? { ...c, subscription_plan: plan } : c
      ));
      
      // Refresh features for new plan
      fetchCompanyFeatures({ ...selectedCompany, subscription_plan: plan });
      toast.success(`Plan updated to ${plan}`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const extendTrial = async (days: number) => {
    if (!selectedCompany) return;
    setSaving(true);

    try {
      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + days);

      const { error } = await supabase
        .from('companies')
        .update({ 
          trial_ends_at: newTrialEnd.toISOString(),
          subscription_status: 'trial'
        })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      setSelectedCompany({ 
        ...selectedCompany, 
        trial_ends_at: newTrialEnd.toISOString(),
        subscription_status: 'trial'
      });
      setCompanies(companies.map(c => 
        c.id === selectedCompany.id ? { ...c, trial_ends_at: newTrialEnd.toISOString(), subscription_status: 'trial' } : c
      ));
      toast.success(`Trial extended by ${days} days`);
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Failed to extend trial');
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(ALL_FEATURES.map(f => f.category))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Company Features</h1>
          <p className="text-muted-foreground">Manage features per company</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Features</h1>
        <p className="text-muted-foreground">View and override features per company</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Companies</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-3">
                {filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCompany?.id === company.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{company.name}</p>
                        <p className={`text-xs truncate ${selectedCompany?.id === company.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {company.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Badge variant={selectedCompany?.id === company.id ? 'secondary' : 'outline'} className="text-[10px]">
                        {company.subscription_plan || 'professional'}
                      </Badge>
                      {company.subscription_status === 'trial' && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Trial
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Feature Management */}
        <Card className="lg:col-span-2">
          {selectedCompany ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedCompany.name}</CardTitle>
                    <CardDescription>{selectedCompany.email}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {selectedCompany.subscription_plan || 'professional'}
                  </Badge>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
                  <Select
                    value={selectedCompany.subscription_plan || 'professional'}
                    onValueChange={updateSubscription}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-[160px]">
                      <Shield className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={() => extendTrial(7)} disabled={saving}>
                    <Calendar className="h-4 w-4 mr-2" />
                    +7 Days Trial
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => extendTrial(30)} disabled={saving}>
                    <Calendar className="h-4 w-4 mr-2" />
                    +30 Days Trial
                  </Button>

                  {selectedCompany.trial_ends_at && (
                    <div className="flex items-center text-sm text-muted-foreground ml-auto">
                      <Sparkles className="h-4 w-4 mr-1 text-amber-500" />
                      Trial ends: {format(new Date(selectedCompany.trial_ends_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {loadingFeatures ? (
                  <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : (
                  <Tabs defaultValue={categories[0]} className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                      {categories.map((category) => (
                        <TabsTrigger key={category} value={category} className="text-xs">
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {categories.map((category) => (
                      <TabsContent key={category} value={category} className="space-y-2">
                        {ALL_FEATURES.filter(f => f.category === category).map((feature) => {
                          const status = getEffectiveFeatureStatus(feature.key);
                          return (
                            <div
                              key={feature.key}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                status.isOverridden ? 'border-primary/50 bg-primary/5' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${status.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                                <div>
                                  <p className="font-medium text-sm">{feature.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {feature.key}
                                    {status.limit && ` (Limit: ${status.limit})`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {status.isOverridden && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOverride(feature.key)}
                                    disabled={saving}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    Reset
                                  </Button>
                                )}
                                <Switch
                                  checked={status.enabled}
                                  onCheckedChange={(checked) => toggleFeature(feature.key, checked)}
                                  disabled={saving}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a company to manage features</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}