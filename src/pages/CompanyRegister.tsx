import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowLeft, Mail, Lock, User, Phone, MapPin, ArrowRight, Check, Zap, Shield, Users, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';
import { SquareCardForm } from '@/components/SquareCardForm';

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
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: '/month',
    description: 'Perfect for small teams getting started',
    icon: <Zap className="h-5 w-5" />,
    features: [
      'Up to 5 dispatchers',
      'Up to 10 field agents',
      '100 tickets/month',
      'Basic notifications',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    period: '/month',
    description: 'For growing companies with more needs',
    icon: <Shield className="h-5 w-5" />,
    popular: true,
    features: [
      'Up to 15 dispatchers',
      'Up to 50 field agents',
      'Unlimited tickets',
      'Real-time tracking',
      'Priority support',
      'Custom reports',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: '/month',
    description: 'For large operations needing full control',
    icon: <Users className="h-5 w-5" />,
    features: [
      'Unlimited dispatchers',
      'Unlimited field agents',
      'Unlimited tickets',
      'Advanced analytics',
      '24/7 phone support',
      'API access',
      'Custom integrations',
    ],
  },
];

const companyTypes: { value: CompanyType; label: string }[] = [
  { value: 'alarm_company', label: 'Fire Alarm' },
  { value: 'tow_company', label: 'Tow Truck' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'security', label: 'Security' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'other', label: 'Other' },
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

const CompanyRegister = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Owner details
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Company details
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('alarm_company');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState('professional');
  
  // Created company ID for payment step
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!fullName.trim() || !username.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please fill in all required fields.',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign up failed',
          description: error.message,
        });
      } else {
        // Update profile with username
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          await supabase
            .from('profiles')
            .update({ username })
            .eq('user_id', currentUser.id);
        }
        
        toast({
          title: 'Account created!',
          description: 'Now let\'s set up your company.',
        });
        setStep(2);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !state || !city.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields.',
      });
      return;
    }
    
    setStep(3);
  };

  const handleStep3Submit = async () => {
    setIsLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to create a company.',
        });
        setStep(1);
        setIsLoading(false);
        return;
      }

      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Create the company
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
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Add owner as admin member
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          company_id: company.id,
          user_id: currentUser.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      setCreatedCompanyId(company.id);
      setStep(4);
      
      toast({
        title: 'Company created!',
        description: 'Now add a payment method to complete registration.',
      });
    } catch (err: any) {
      let errorMessage = 'Failed to create company.';
      
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        errorMessage = 'A company with this email already exists. Please use a different email address.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardNonce = async (cardNonce: string) => {
    if (!createdCompanyId) return;
    
    setIsLoading(true);
    
    try {
      // Call Square edge function to create customer and save card
      const response = await supabase.functions.invoke('square-create-customer', {
        body: {
          companyId: createdCompanyId,
          email: companyEmail || email,
          companyName,
          cardNonce,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save payment method');
      }

      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      toast({
        title: 'Registration complete!',
        description: `Your ${data.cardBrand} card ending in ${data.last4} will be charged after the trial.`,
      });

      navigate('/admin');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Payment Setup Failed',
        description: err.message || 'Could not save payment method. You can add it later in billing settings.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const skipPaymentSetup = () => {
    toast({
      title: 'Registration complete!',
      description: 'You can add a payment method later in billing settings.',
    });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-4xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 max-w-lg">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary-foreground/60'
          }`}>
            1
          </div>
          <div className="flex-1 h-1 bg-primary/20 rounded overflow-hidden">
            <div className={`h-full bg-primary rounded transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary-foreground/60'
          }`}>
            2
          </div>
          <div className="flex-1 h-1 bg-primary/20 rounded overflow-hidden">
            <div className={`h-full bg-primary rounded transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary-foreground/60'
          }`}>
            3
          </div>
          <div className="flex-1 h-1 bg-primary/20 rounded overflow-hidden">
            <div className={`h-full bg-primary rounded transition-all duration-300 ${step >= 4 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary-foreground/60'
          }`}>
            4
          </div>
        </div>

        {step === 1 && (
          <Card className="animate-scale-in shadow-xl border-0 max-w-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-display">Create Your Account</CardTitle>
              <CardDescription>
                Set up your owner account to get started
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleStep1Submit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="username"
                        type="text"
                        placeholder="johndoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className="pl-10"
                        required
                      />
                    </div>
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
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="animate-scale-in shadow-xl border-0 max-w-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-display">Company Information</CardTitle>
              <CardDescription>
                Tell us about your business
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleStep2Submit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="ABC Services Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="info@company.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyPhone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyType">Company Field *</Label>
                  <Select value={companyType} onValueChange={(value: CompanyType) => setCompanyType(value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select your field" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {companyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px]">
                        {usStates.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="city"
                        type="text"
                        placeholder="Los Angeles"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                >
                  Choose Your Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="inline h-3 w-3 mr-1" />
                  Back to account details
                </button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 3 && (
          <div className="animate-scale-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-primary-foreground mb-2">
                Choose Your Plan
              </h2>
              <p className="text-primary-foreground/80">
                All plans include a 14-day free trial. No credit card required.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:shadow-xl ${
                    selectedPlan === plan.id 
                      ? 'ring-2 ring-primary border-primary shadow-xl' 
                      : 'border-border hover:-translate-y-1'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      selectedPlan === plan.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {plan.icon}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-3 text-left">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className={`h-4 w-4 ${selectedPlan === plan.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant={selectedPlan === plan.id ? "default" : "outline"} 
                      className="w-full"
                    >
                      {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-primary-foreground/80 hover:text-primary-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button 
                size="lg"
                onClick={handleStep3Submit}
                disabled={isLoading}
                className="px-8"
              >
                {isLoading ? 'Creating company...' : (
                  <>
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <Card className="animate-scale-in shadow-xl border-0 max-w-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
                <CreditCard className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-display">Add Payment Method</CardTitle>
              <CardDescription>
                Your card will be charged ${plans.find(p => p.id === selectedPlan)?.price || 79}/month after the 14-day trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SquareCardForm
                onCardNonce={handleCardNonce}
                isLoading={isLoading}
                buttonText="Save Card & Complete Registration"
              />
            </CardContent>
            <CardFooter className="flex justify-center">
              <button
                type="button"
                onClick={skipPaymentSetup}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now - add payment later
              </button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanyRegister;
