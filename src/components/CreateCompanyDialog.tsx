import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, Phone, MapPin, User, DollarSign, Percent, Calendar, Loader2, Gift, Shield, Sparkles, CreditCard, Clock } from "lucide-react";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMPANY_TYPES = [
  { value: 'boat_services', label: 'Boat Services' },
  { value: 'alarm_company', label: 'Alarm Company' },
  { value: 'tow_company', label: 'Tow Company' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'security', label: 'Security' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'other', label: 'Other' },
];

// Default fallback plans (used while loading from database)
const DEFAULT_SUBSCRIPTION_PLANS = [
  { value: 'professional', label: 'Professional', monthlyPrice: 349, yearlyPrice: 2990, description: 'Growing teams ready to scale' },
  { value: 'advanced', label: 'Advanced', monthlyPrice: 899, yearlyPrice: 7490, description: 'High-volume organizations', popular: true },
  { value: 'enterprise', label: 'Enterprise', monthlyPrice: 0, yearlyPrice: 0, description: 'Custom pricing for large operations', isCustom: true },
];

export function CreateCompanyDialog({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch dynamic plans from database
  const { plans: dbPlans, isLoading: plansLoading } = useSubscriptionPlans();
  
  // Map database plans to component format
  const SUBSCRIPTION_PLANS = useMemo(() => {
    if (!dbPlans || dbPlans.length === 0) return DEFAULT_SUBSCRIPTION_PLANS;
    
    return dbPlans.map(plan => ({
      value: plan.id,
      label: plan.name,
      monthlyPrice: plan.monthly_price / 100, // Convert cents to dollars
      yearlyPrice: plan.yearly_price / 100,
      description: plan.description || '',
      popular: plan.is_popular,
      isCustom: plan.is_custom_pricing,
    }));
  }, [dbPlans]);
  
  // Company Details
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyType, setCompanyType] = useState<string>("boat_services");
  
  // Owner Details
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  
  // Subscription & Billing
  const [isFreeAccount, setIsFreeAccount] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("professional");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [billingMode, setBillingMode] = useState<"trial" | "require_card">("trial");
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [skipApproval, setSkipApproval] = useState(true);
  
  // Notes
  const [internalNotes, setInternalNotes] = useState("");

  const resetForm = () => {
    setCompanyName("");
    setCompanyEmail("");
    setCompanyPhone("");
    setCompanyAddress("");
    setCompanyCity("");
    setCompanyState("");
    setCompanyType("boat_services");
    setOwnerName("");
    setOwnerEmail("");
    setTempPassword("");
    setIsFreeAccount(false);
    setSubscriptionPlan("professional");
    setBillingCycle("monthly");
    setBillingMode("trial");
    setApplyDiscount(false);
    setDiscountType("percentage");
    setDiscountValue("");
    setTrialDays("14");
    setSkipApproval(true);
    setInternalNotes("");
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(password);
  };

  const getBasePrice = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    if (plan.isCustom) return 0;
    return billingCycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  };

  const calculateFinalPrice = () => {
    if (isFreeAccount) return 0;
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.value === subscriptionPlan);
    if (!plan || plan.isCustom) return 0;
    
    let basePrice = getBasePrice(plan);
    
    if (applyDiscount && discountValue) {
      if (discountType === "percentage") {
        basePrice = basePrice * (1 - parseFloat(discountValue) / 100);
      } else {
        basePrice = basePrice - parseFloat(discountValue);
      }
    }
    
    return Math.max(0, basePrice);
  };

  const calculateYearlySavings = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    if (plan.isCustom) return 0;
    return (plan.monthlyPrice * 12) - plan.yearlyPrice;
  };

  const handleSubmit = async () => {
    if (!companyName || !companyEmail || !ownerEmail || !ownerName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + parseInt(trialDays));

      // Create the user first using edge function
      const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
        body: {
          email: ownerEmail,
          password: tempPassword || undefined,
          full_name: ownerName,
          role: 'admin',
        }
      });

      if (userError) throw userError;

      const userId = userData?.user?.id;
      if (!userId) throw new Error("Failed to create user account");

      // Build business config with discount info
      const businessConfig: Record<string, any> = {};
      
      if (isFreeAccount) {
        businessConfig.is_free_account = true;
        businessConfig.free_account_granted_by = 'super_admin';
        businessConfig.free_account_granted_at = new Date().toISOString();
      } else {
        // Set billing mode
        businessConfig.billing_mode = billingMode;
        
        if (billingMode === 'require_card') {
          businessConfig.require_card_before_access = true;
          businessConfig.card_required_at = new Date().toISOString();
        }
        
        if (applyDiscount && discountValue) {
          businessConfig.discount = {
            type: discountType,
            value: parseFloat(discountValue),
            applied_by: 'super_admin',
            applied_at: new Date().toISOString(),
          };
          const selectedPlanData = SUBSCRIPTION_PLANS.find(p => p.value === subscriptionPlan);
          businessConfig.original_price = selectedPlanData ? getBasePrice(selectedPlanData) : 0;
          businessConfig.discounted_price = calculateFinalPrice();
          businessConfig.billing_cycle = billingCycle;
        }
      }
      
      if (internalNotes) {
        businessConfig.internal_notes = internalNotes;
      }

      // Create the company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email: companyEmail,
          phone: companyPhone || null,
          address: companyAddress || null,
          city: companyCity || null,
          state: companyState || null,
          type: companyType as any,
          owner_id: userId,
          approval_status: skipApproval ? 'approved' : 'pending',
          approved_at: skipApproval ? new Date().toISOString() : null,
          subscription_plan: isFreeAccount ? 'free' : subscriptionPlan,
          subscription_status: isFreeAccount ? 'active' : (billingMode === 'trial' ? 'trial' : 'pending_payment'),
          billing_cycle: isFreeAccount ? null : billingCycle,
          trial_ends_at: (isFreeAccount || billingMode !== 'trial') ? null : trialEndsAt.toISOString(),
          is_active: true,
          business_config: Object.keys(businessConfig).length > 0 ? businessConfig : null,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Add user as company member
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          company_id: companyData.id,
          user_id: userId,
          role: 'admin',
          is_active: true,
        });

      if (memberError) throw memberError;

      // Create profile for the user
      await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: ownerEmail,
          full_name: ownerName,
        });

      // Notify super admin of new company creation (fire and forget)
      supabase.functions.invoke('notify-new-registration', {
        body: {
          type: 'new_company',
          data: {
            company_name: companyName,
            company_email: companyEmail,
            user_name: ownerName,
            user_email: ownerEmail,
            company_id: companyData.id,
            additional_info: isFreeAccount 
              ? `Free Account - Plan: ${subscriptionPlan}` 
              : `Plan: ${subscriptionPlan}${applyDiscount ? `, Discount: ${discountValue}${discountType === 'percentage' ? '%' : '$'}` : ''}`,
          }
        }
      }).catch(err => console.log('Notification send failed (non-critical):', err));

      toast.success("Company created successfully!", {
        description: `${companyName} has been set up with ${ownerEmail} as the owner.`
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error("Failed to create company", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.value === subscriptionPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Create New Company
          </DialogTitle>
          <DialogDescription>
            Manually create a company account with optional discounts and custom settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Services LLC"
                />
              </div>
              <div>
                <Label htmlFor="company-email">Company Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company-email"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="info@company.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="company-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company-phone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="company-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company-address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="company-city">City</Label>
                <Input
                  id="company-city"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  placeholder="Miami"
                />
              </div>
              <div>
                <Label htmlFor="company-state">State</Label>
                <Input
                  id="company-state"
                  value={companyState}
                  onChange={(e) => setCompanyState(e.target.value)}
                  placeholder="FL"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="company-type">Company Type</Label>
                <Select value={companyType} onValueChange={setCompanyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Owner Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Owner Account
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner-name">Full Name *</Label>
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="owner-email">Email *</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="john@company.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="temp-password">Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="temp-password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Leave empty for auto-generated"
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The owner will receive this password and be prompted to change it on first login
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription & Billing */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Subscription & Billing
            </h3>
            <div className="space-y-4">
              {/* Free Account Option */}
              <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <div>
                      <Label htmlFor="free-account" className="font-medium">Free Account</Label>
                      <p className="text-xs text-muted-foreground">Grant this company free access (no billing)</p>
                    </div>
                  </div>
                  <Switch
                    id="free-account"
                    checked={isFreeAccount}
                    onCheckedChange={setIsFreeAccount}
                  />
                </div>
                {isFreeAccount && (
                  <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                    <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      This account will have full access without any subscription fees
                    </p>
                  </div>
                )}
              </div>

              {!isFreeAccount && (
                <>
                  {/* Billing Cycle Toggle */}
                  <div className="flex items-center justify-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Monthly
                    </span>
                    <Switch
                      checked={billingCycle === "yearly"}
                      onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
                    />
                    <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Yearly
                    </span>
                    {billingCycle === "yearly" && (
                      <Badge variant="secondary" className="ml-2">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Save up to 29%
                      </Badge>
                    )}
                  </div>

                  <div>
                    <Label>Subscription Plan</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {SUBSCRIPTION_PLANS.map((plan) => (
                        <div
                          key={plan.value}
                          className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                            subscriptionPlan === plan.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:border-muted-foreground/50'
                          } ${plan.popular ? 'border-secondary' : ''}`}
                          onClick={() => setSubscriptionPlan(plan.value)}
                        >
                          {plan.popular && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Popular</Badge>
                            </div>
                          )}
                          <p className="font-medium">{plan.label}</p>
                          {plan.isCustom ? (
                            <p className="text-sm font-medium text-muted-foreground">Custom Pricing</p>
                          ) : (
                            <>
                              <p className="text-lg font-bold">
                                ${getBasePrice(plan)}
                                <span className="text-xs font-normal text-muted-foreground">/mo</span>
                              </p>
                              {billingCycle === "yearly" && (
                                <p className="text-[10px] text-green-600">
                                  Save ${calculateYearlySavings(plan)}/yr
                                </p>
                              )}
                            </>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{plan.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discount Section */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600" />
                        <Label htmlFor="apply-discount" className="font-medium">Apply Discount</Label>
                      </div>
                      <Switch
                        id="apply-discount"
                        checked={applyDiscount}
                        onCheckedChange={setApplyDiscount}
                      />
                    </div>
                    
                    {applyDiscount && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label>Discount Type</Label>
                          <Select value={discountType} onValueChange={(v: "percentage" | "fixed") => setDiscountType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                <span className="flex items-center gap-2">
                                  <Percent className="h-3 w-3" /> Percentage
                                </span>
                              </SelectItem>
                              <SelectItem value="fixed">
                                <span className="flex items-center gap-2">
                                  <DollarSign className="h-3 w-3" /> Fixed Amount
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>
                            {discountType === "percentage" ? "Discount %" : "Discount Amount ($)"}
                          </Label>
                          <Input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={discountType === "percentage" ? "20" : "50"}
                          />
                        </div>
                        {discountValue && selectedPlan && !selectedPlan.isCustom && (
                          <div className="col-span-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Original Price:</span>
                              <span className="line-through">${getBasePrice(selectedPlan)}/mo</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm font-medium">Final Price:</span>
                              <span className="text-lg font-bold text-green-600">${calculateFinalPrice().toFixed(2)}/mo</span>
                            </div>
                            {billingCycle === "yearly" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Billed annually: ${(calculateFinalPrice() * 12).toFixed(0)}/year
                              </p>
                            )}
                            <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100">
                              {discountType === "percentage" 
                                ? `${discountValue}% OFF`
                                : `$${discountValue} OFF`
                              }
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Billing Mode Section */}
                  <div className="border rounded-lg p-4">
                    <Label className="font-medium mb-3 block">Billing Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          billingMode === 'trial'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setBillingMode('trial')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <p className="font-medium">Start with Trial</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          User gets full access during trial. Card is collected and charged when trial ends.
                        </p>
                      </div>
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          billingMode === 'require_card'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setBillingMode('require_card')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-green-600" />
                          <p className="font-medium">Require Card First</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          User must add payment card before accessing dashboard. Charged immediately after.
                        </p>
                      </div>
                    </div>
                    
                    {billingMode === 'trial' && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Label className="text-sm">Trial Duration</Label>
                        <Select value={trialDays} onValueChange={setTrialDays}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="14">14 days (Standard)</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          Trial ends on: {new Date(Date.now() + parseInt(trialDays) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {billingMode === 'require_card' && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                          <CreditCard className="h-3 w-3" />
                          User will see a payment gate on first login. They cannot access the dashboard until they add a valid card and complete payment.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Skip Approval */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <div>
                    <Label htmlFor="skip-approval" className="font-medium">Auto-Approve Company</Label>
                    <p className="text-xs text-muted-foreground">Skip the approval queue and activate immediately</p>
                  </div>
                </div>
                <Switch
                  id="skip-approval"
                  checked={skipApproval}
                  onCheckedChange={setSkipApproval}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Internal Notes */}
          <div>
            <Label htmlFor="internal-notes">Internal Notes (for your reference)</Label>
            <Textarea
              id="internal-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g., Referred by John Doe, promised 20% discount for first year..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Create Company
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
