import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { PromoValidationResult } from '@/hooks/usePromoCodes';
import { SquareCardForm } from '@/components/SquareCardForm';
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

type AuthMethod = 'email' | 'phone' | 'google';

const CompanyRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
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

  // Email auth fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Phone auth fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneFirstName, setPhoneFirstName] = useState('');
  const [phoneLastName, setPhoneLastName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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

  // Check if user is already logged in (e.g., from Google OAuth)
  useEffect(() => {
    if (user && !accountComplete) {
      setAccountComplete(true);
      setAccountOpen(false);
      setCompanyOpen(true);
      toast({ title: 'Welcome!', description: 'Please complete your company registration.' });
    }
  }, [user]);

  // Email validation
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  useEffect(() => {
    if (!email) {
      setEmailError(null);
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Password strength validation
  const validatePassword = (pwd: string) => {
    const requirements = {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(password);
  const isPasswordStrong = Object.values(passwordRequirements).every(Boolean);

  // Password match validation
  useEffect(() => {
    if (!confirmPassword) {
      setPasswordError(null);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError(null);
    }
  }, [password, confirmPassword]);


  const handleEmailSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }
    if (emailError) {
      toast({ variant: 'destructive', title: 'Invalid email', description: emailError });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Password mismatch', description: 'Passwords do not match.' });
      return;
    }
    if (!isPasswordStrong) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Password must meet all requirements.' });
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
        return;
      }

      setAccountComplete(true);
      setAccountOpen(false);
      setCompanyOpen(true);
      toast({ title: 'Account created!', description: 'Now complete your company registration.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneOTP = async () => {
    if (!phoneNumber.trim() || !phoneFirstName.trim() || !phoneLastName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
    
    setIsLoading(true);
    try {
      const fullName = `${phoneFirstName.trim()} ${phoneLastName.trim()}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      setOtpSent(true);
      toast({ title: 'Code sent!', description: `Enter the 6-digit code sent to ${formattedPhone}` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to send code.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter the 6-digit code.' });
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;

    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        const fullName = `${phoneFirstName.trim()} ${phoneLastName.trim()}`;
        await supabase.from('profiles').update({ 
          full_name: fullName 
        }).eq('user_id', data.user.id);
      }

      setAccountComplete(true);
      setAccountOpen(false);
      setCompanyOpen(true);
      toast({ title: 'Phone verified!', description: 'Now complete your company registration.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verification failed', description: error.message || 'Invalid code.' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/register-company`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Google sign-in failed.' });
      setIsLoading(false);
    }
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

      const userEmail = currentUser.email || companyEmail || email;

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email: companyEmail || userEmail,
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
        body: { companyId: company.id, email: companyEmail || userEmail, companyName, cardNonce },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      toast({
        title: 'Registration complete! 🎉',
        description: `Your ${getTrialDays()}-day free trial has started.`,
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
          {user && (
            <Button 
              variant="ghost" 
              className="mt-4 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/admin')}
            >
              Skip for now, I'll complete this later →
            </Button>
          )}
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-0">
            {/* Section 1: Account */}
            <Collapsible open={accountOpen && !accountComplete} onOpenChange={setAccountOpen}>
              <SectionHeader
                title="Create Account"
                icon={User}
                complete={accountComplete}
                open={accountOpen && !accountComplete}
                onToggle={() => !accountComplete && setAccountOpen(!accountOpen)}
                number={1}
                disabled={accountComplete}
              />
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </TabsTrigger>
                      <TabsTrigger value="google" className="flex items-center gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="you@example.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className={`pl-10 ${emailError ? 'border-destructive' : email && !emailError ? 'border-green-500' : ''}`} 
                          />
                          {email && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {emailError ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </div>
                          )}
                        </div>
                        {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={8} />
                        </div>
                        {password && (
                          <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-2 text-xs">
                              {passwordRequirements.minLength ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              <span className={passwordRequirements.minLength ? 'text-green-600' : 'text-muted-foreground'}>At least 8 characters</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {passwordRequirements.hasUppercase ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              <span className={passwordRequirements.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>One uppercase letter</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {passwordRequirements.hasLowercase ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              <span className={passwordRequirements.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>One lowercase letter</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {passwordRequirements.hasNumber ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              <span className={passwordRequirements.hasNumber ? 'text-green-600' : 'text-muted-foreground'}>One number</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {passwordRequirements.hasSymbol ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                              <span className={passwordRequirements.hasSymbol ? 'text-green-600' : 'text-muted-foreground'}>One symbol (!@#$%^&*...)</span>
                            </div>
                          </div>
                        )}
                        {!password && <p className="text-xs text-muted-foreground">Min 8 chars: uppercase, lowercase, number, symbol</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="confirmPassword" 
                            type="password" 
                            placeholder="••••••••" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            className={`pl-10 ${passwordError ? 'border-destructive' : confirmPassword && !passwordError ? 'border-green-500' : ''}`} 
                          />
                          {confirmPassword && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {passwordError ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </div>
                          )}
                        </div>
                        {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                      </div>
                      <Button className="w-full" onClick={handleEmailSignUp} disabled={isLoading || !!emailError || !!passwordError}>
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</> : 'Continue with Email'}
                      </Button>
                    </TabsContent>

                    <TabsContent value="phone" className="space-y-4">
                      {!otpSent ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="phoneFirstName">First Name *</Label>
                              <Input id="phoneFirstName" placeholder="John" value={phoneFirstName} onChange={(e) => setPhoneFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phoneLastName">Last Name *</Label>
                              <Input id="phoneLastName" placeholder="Doe" value={phoneLastName} onChange={(e) => setPhoneLastName(e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number *</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phoneNumber"
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">We'll send a 6-digit verification code</p>
                          </div>
                          <Button className="w-full" onClick={handleSendPhoneOTP} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Code...</> : 'Send Verification Code'}
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                              Enter the 6-digit code sent to {phoneNumber}
                            </p>
                            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                              <InputOTPGroup className="justify-center">
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <Button className="w-full" onClick={handleVerifyPhoneOTP} disabled={verifyingOtp || otpCode.length !== 6}>
                            {verifyingOtp ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Verify Code'}
                          </Button>
                          <Button variant="ghost" className="w-full" onClick={() => { setOtpSent(false); setOtpCode(''); }}>
                            Use a different number
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="google" className="space-y-4">
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          Sign up quickly with your Google account
                        </p>
                        <Button className="w-full" variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}>
                          {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                          ) : (
                            <>
                              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Continue with Google
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <p className="text-sm text-center text-muted-foreground mt-4">
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

                  <PromoCodeInput plan={selectedPlan} onPromoApplied={setAppliedPromo} />

                  {appliedPromo?.valid && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        🎉 {appliedPromo.message}
                      </p>
                    </div>
                  )}

                  <Button className="w-full" onClick={handlePlanComplete}>Continue to Payment</Button>
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
