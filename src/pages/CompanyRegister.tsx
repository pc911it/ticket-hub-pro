import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { PromoValidationResult } from '@/hooks/usePromoCodes';
import { SquareCardForm } from '@/components/SquareCardForm';
import { VerificationStep } from '@/components/VerificationStep';
import { 
  Building2, ArrowLeft, Mail, Lock, User, Phone, MapPin, 
  Check, Zap, Shield, Users, CreditCard, Loader2, AlertCircle, 
  CheckCircle2, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type CompanyType = Database["public"]["Enums"]["company_type"];

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

const plans: PricingPlan[] = [
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    period: '/month',
    description: 'Complete business OS for growing teams',
    icon: <Shield className="h-5 w-5" />,
    features: ['Up to 10 dispatchers', 'Up to 25 field agents', 'Inventory Management', 'Project Management', 'Digital Invoicing', 'Live GPS Tracking'],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: 899,
    period: '/month',
    description: 'Advanced tools for scaling operations',
    icon: <Zap className="h-5 w-5" />,
    popular: true,
    features: ['Up to 30 dispatchers', 'Up to 100 field agents', 'Everything in Professional', 'Advanced Analytics', 'API Access', 'Priority Support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    period: '',
    description: 'Custom solutions for large organizations',
    icon: <Users className="h-5 w-5" />,
    features: ['Unlimited dispatchers', 'Unlimited field agents', 'White-label Portal', 'Custom Integrations', 'Dedicated Account Manager'],
  },
];

const companyTypes: { value: CompanyType; label: string; icon: string }[] = [
  { value: 'alarm_company', label: 'Fire Alarm & Safety', icon: '🔥' },
  { value: 'tow_company', label: 'Tow Truck Services', icon: '🚗' },
  { value: 'electrician', label: 'Electrical Services', icon: '⚡' },
  { value: 'plumber', label: 'Plumbing Services', icon: '🔧' },
  { value: 'hvac', label: 'HVAC Services', icon: '❄️' },
  { value: 'security', label: 'Security Services', icon: '🔒' },
  { value: 'locksmith', label: 'Locksmith Services', icon: '🔑' },
  { value: 'boat_services', label: 'Boat & Marine Services', icon: '⛵' },
  { value: 'other', label: 'General Contractor / Other', icon: '🏗️' },
];

const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

const businessConfigs: Record<CompanyType, { ticketLabel: string; clientLabel: string; inventoryCategories: string[]; exampleServices: string[] }> = {
  alarm_company: { ticketLabel: 'Service Call', clientLabel: 'Customer', exampleServices: ['Panel Installation', 'Sensor Replacement', 'System Monitoring'], inventoryCategories: ['Smoke Detectors', 'CO Detectors', 'Control Panels'] },
  tow_company: { ticketLabel: 'Tow Job', clientLabel: 'Customer', exampleServices: ['Local Tow', 'Long Distance', 'Roadside Assistance'], inventoryCategories: ['Straps', 'Chains', 'Dollies'] },
  electrician: { ticketLabel: 'Work Order', clientLabel: 'Customer', exampleServices: ['Panel Upgrade', 'Outlet Installation', 'Lighting'], inventoryCategories: ['Wire', 'Outlets', 'Switches'] },
  plumber: { ticketLabel: 'Service Call', clientLabel: 'Customer', exampleServices: ['Leak Repair', 'Drain Cleaning', 'Water Heater'], inventoryCategories: ['Pipes', 'Fittings', 'Valves'] },
  hvac: { ticketLabel: 'Service Call', clientLabel: 'Customer', exampleServices: ['AC Repair', 'Furnace Service', 'Duct Cleaning'], inventoryCategories: ['Filters', 'Refrigerant', 'Thermostats'] },
  security: { ticketLabel: 'Service Call', clientLabel: 'Customer', exampleServices: ['Camera Installation', 'Alarm Setup', 'Access Control'], inventoryCategories: ['Cameras', 'DVRs', 'Keypads'] },
  locksmith: { ticketLabel: 'Service Call', clientLabel: 'Customer', exampleServices: ['Lockout Service', 'Lock Change', 'Key Duplication'], inventoryCategories: ['Locks', 'Keys', 'Deadbolts'] },
  boat_services: { ticketLabel: 'Work Order', clientLabel: 'Boat Owner', exampleServices: ['Engine Repair', 'Hull Maintenance', 'Electrical Systems'], inventoryCategories: ['Marine Parts', 'Fiberglass', 'Marine Paint'] },
  other: { ticketLabel: 'Work Order', clientLabel: 'Client', exampleServices: ['General Repair', 'Installation', 'Maintenance'], inventoryCategories: ['General', 'Tools', 'Materials'] },
};

type RegistrationStep = 'account' | 'verify' | 'complete';

const CompanyRegister = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Section open states
  const [accountOpen, setAccountOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Completion states
  const [accountComplete, setAccountComplete] = useState(false);
  const [companyComplete, setCompanyComplete] = useState(false);
  const [planComplete, setPlanComplete] = useState(false);

  // Account fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('other');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // Plan & promo
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null);

  // Company ID after creation
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  // Username validation
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameError(username.length > 0 ? 'Username must be at least 3 characters' : null);
        return;
      }
      setCheckingUsername(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        setUsernameError(data ? 'This username is already taken' : null);
      } catch {
        setUsernameError(null);
      } finally {
        setCheckingUsername(false);
      }
    };
    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleAccountSubmit = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }
    if (usernameError) {
      toast({ variant: 'destructive', title: 'Invalid username', description: usernameError });
      return;
    }

    setIsLoading(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).maybeSingle();
      if (existing) {
        toast({ variant: 'destructive', title: 'Username taken', description: 'Please choose another username.' });
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('profiles').update({ username: username.toLowerCase() }).eq('user_id', currentUser.id);
      }

      toast({ title: 'Account created!', description: 'Please verify your email to continue.' });
      setCurrentStep('verify');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = () => {
    setAccountComplete(true);
    setAccountOpen(false);
    setCompanyOpen(true);
    setCurrentStep('complete');
    toast({ title: 'Verified!', description: 'Now complete your registration.' });
  };

  const handleCompanyComplete = () => {
    if (!companyName.trim() || !state || !city.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
      return;
    }
    setCompanyComplete(true);
    setCompanyOpen(false);
    setPlanOpen(true);
  };

  const handlePlanComplete = () => {
    setPlanComplete(true);
    setPlanOpen(false);
    setPaymentOpen(true);
  };

  const calculateFinalPrice = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan || plan.price === 0) return 0;
    
    let price = plan.price;
    if (appliedPromo?.valid && appliedPromo.promoCode) {
      if (appliedPromo.promoCode.discount_type === 'percentage') {
        price = price * (1 - appliedPromo.promoCode.discount_value / 100);
      } else if (appliedPromo.promoCode.discount_type === 'fixed') {
        price = Math.max(0, price - appliedPromo.promoCode.discount_value);
      }
    }
    return Math.round(price * 100) / 100;
  };

  const getTrialDays = () => {
    let days = 14;
    if (appliedPromo?.valid && appliedPromo.promoCode?.discount_type === 'trial_extension') {
      days += appliedPromo.promoCode.trial_extension_days;
    }
    return days;
  };

  const handleCardNonce = async (cardNonce: string) => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }

      const config = businessConfigs[companyType];
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + getTrialDays());

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email: companyEmail || email,
          phone: companyPhone,
          type: companyType,
          state,
          city,
          owner_id: currentUser.id,
          subscription_plan: selectedPlan,
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          business_config: {
            ticketLabel: config.ticketLabel,
            clientLabel: config.clientLabel,
            inventoryCategories: config.inventoryCategories,
          },
        } as any)
        .select()
        .single();

      if (companyError) throw companyError;

      // Seed service types
      await supabase.from('company_service_types').insert(
        config.exampleServices.map(name => ({ company_id: company.id, name, is_active: true }))
      );

      // Add owner as admin
      await supabase.from('company_members').insert({
        company_id: company.id,
        user_id: currentUser.id,
        role: 'admin',
      });

      // Apply promo code if valid
      if (appliedPromo?.valid && appliedPromo.promoCode) {
        await supabase.from('company_promo_codes').insert({
          company_id: company.id,
          promo_code_id: appliedPromo.promoCode.id,
          discount_applied: appliedPromo.discountAmount,
          trial_extended_days: appliedPromo.trialExtensionDays,
        });
      }

      // Save card via Square
      const response = await supabase.functions.invoke('square-create-customer', {
        body: { companyId: company.id, email: companyEmail || email, companyName, cardNonce },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      toast({
        title: 'Registration complete! 🎉',
        description: `Your ${getTrialDays()}-day free trial has started. Card ending in ${response.data.last4} will be charged $${calculateFinalPrice()}/month after the trial.`,
      });

      navigate('/admin');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Registration failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const SectionHeader = ({ 
    title, icon: Icon, complete, open, onToggle, number, disabled 
  }: { 
    title: string; icon: any; complete: boolean; open: boolean; onToggle: () => void; number: number; disabled?: boolean 
  }) => (
    <CollapsibleTrigger 
      onClick={disabled ? undefined : onToggle}
      className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
      } ${open ? 'bg-muted/30' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          complete ? 'bg-green-500 text-white' : open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {complete ? <Check className="h-4 w-4" /> : number}
        </div>
        <Icon className={`h-5 w-5 ${complete ? 'text-green-500' : open ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`font-medium ${complete ? 'text-green-600' : ''}`}>{title}</span>
      </div>
      {!disabled && (open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />)}
    </CollapsibleTrigger>
  );

  if (currentStep === 'verify') {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--gradient-hero)' }}>
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <VerificationStep
            email={email}
            phone={companyPhone}
            onVerified={handleVerificationComplete}
            onBack={() => setCurrentStep('account')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-primary-foreground/80">
            Complete your registration in just a few steps
          </p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-0">
            {/* Section 1: Account */}
            <Collapsible open={accountOpen && currentStep === 'account'} onOpenChange={setAccountOpen}>
              <SectionHeader
                title="Create Account"
                icon={User}
                complete={accountComplete}
                open={accountOpen && currentStep === 'account'}
                onToggle={() => !accountComplete && setAccountOpen(!accountOpen)}
                number={1}
                disabled={accountComplete}
              />
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <Input
                          id="username"
                          placeholder="johndoe"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          className={`pl-10 pr-10 ${usernameError ? 'border-destructive' : username.length >= 3 && !checkingUsername ? 'border-green-500' : ''}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {!checkingUsername && usernameError && <AlertCircle className="h-4 w-4 text-destructive" />}
                          {!checkingUsername && !usernameError && username.length >= 3 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                      {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAccountSubmit} disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Continue'}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account? <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="border-t" />

            {/* Section 2: Company */}
            <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
              <SectionHeader
                title="Company Information"
                icon={Building2}
                complete={companyComplete}
                open={companyOpen}
                onToggle={() => accountComplete && !companyComplete && setCompanyOpen(!companyOpen)}
                number={2}
                disabled={!accountComplete || companyComplete}
              />
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="companyName" placeholder="ABC Services Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="companyEmail" type="email" placeholder="info@company.com" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Company Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="companyPhone" type="tel" placeholder="+1 (555) 000-0000" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Type *</Label>
                    <Select value={companyType} onValueChange={(v) => setCompanyType(v as CompanyType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {companyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {usStates.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="city" placeholder="Los Angeles" value={city} onChange={(e) => setCity(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCompanyComplete}>Continue to Plan Selection</Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="border-t" />

            {/* Section 3: Plan Selection */}
            <Collapsible open={planOpen} onOpenChange={setPlanOpen}>
              <SectionHeader
                title="Choose Your Plan"
                icon={Sparkles}
                complete={planComplete}
                open={planOpen}
                onToggle={() => companyComplete && !planComplete && setPlanOpen(!planOpen)}
                number={3}
                disabled={!companyComplete || planComplete}
              />
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedPlan === plan.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {plan.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{plan.name}</span>
                                {plan.popular && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Popular</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {plan.price > 0 ? (
                              <>
                                <span className="text-2xl font-bold">${plan.price}</span>
                                <span className="text-muted-foreground">{plan.period}</span>
                              </>
                            ) : (
                              <span className="text-lg font-medium">Contact Us</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <PromoCodeInput
                    plan={selectedPlan}
                    onPromoApplied={setAppliedPromo}
                  />

                  {appliedPromo?.valid && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        🎉 {appliedPromo.message}
                      </p>
                    </div>
                  )}

                  <Button className="w-full" onClick={handlePlanComplete}>
                    Continue to Payment
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="border-t" />

            {/* Section 4: Payment */}
            <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
              <SectionHeader
                title="Payment Method"
                icon={CreditCard}
                complete={false}
                open={paymentOpen}
                onToggle={() => planComplete && setPaymentOpen(!paymentOpen)}
                number={4}
                disabled={!planComplete}
              />
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Plan:</span>
                      <span className="font-medium">{plans.find(p => p.id === selectedPlan)?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Free Trial:</span>
                      <span className="font-medium text-green-600">{getTrialDays()} days</span>
                    </div>
                    {appliedPromo?.valid && appliedPromo.promoCode?.discount_type !== 'trial_extension' && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Promo Discount:</span>
                        <span className="font-medium">-{appliedPromo.promoCode?.discount_type === 'percentage' ? `${appliedPromo.promoCode.discount_value}%` : `$${appliedPromo.promoCode?.discount_value}`}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">After trial:</span>
                      <span className="font-bold text-lg">${calculateFinalPrice()}/month</span>
                    </div>
                  </div>

                  <SquareCardForm
                    onCardNonce={handleCardNonce}
                    isLoading={isLoading}
                    buttonText={`Start ${getTrialDays()}-Day Free Trial`}
                  />

                  <p className="text-xs text-center text-muted-foreground">
                    Your card will be charged ${calculateFinalPrice()}/month after your {getTrialDays()}-day trial ends. Cancel anytime.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/60 text-sm mt-6">
          Need help? <a href="mailto:support@builderflow.app" className="underline">Contact support</a>
        </p>
      </div>
    </div>
  );
};

export default CompanyRegister;
