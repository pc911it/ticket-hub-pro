import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for small teams',
    features: ['Up to 5 agents', '100 tickets/month', 'Basic reporting', 'Email support'],
  },
  {
    name: 'Professional',
    price: 79,
    description: 'For growing businesses',
    features: ['Up to 15 agents', 'Unlimited tickets', 'Advanced reporting', 'Priority support', 'Inventory management'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For large organizations',
    features: ['Unlimited agents', 'Unlimited tickets', 'Custom reporting', '24/7 support', 'API access', 'Custom integrations'],
  },
];

export default function UpgradePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [daysExpired, setDaysExpired] = useState(0);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!user) return;

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, trial_ends_at')
          .eq('id', membership.company_id)
          .single();

        if (company) {
          setCompanyName(company.name);
          if (company.trial_ends_at) {
            const expired = Math.floor(
              (new Date().getTime() - new Date(company.trial_ends_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            setDaysExpired(Math.max(0, expired));
          }
        }
      }
    };

    fetchCompanyInfo();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-foreground">{companyName || 'Your Company'}</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Trial Expired Notice */}
        <div className="max-w-2xl mx-auto mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full mb-6">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Trial expired {daysExpired > 0 ? `${daysExpired} days ago` : 'today'}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Your free trial has ended
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose a plan to continue using all features. Your data is safe and will be available once you subscribe.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'border-secondary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Need help choosing? Contact us at{' '}
            <a href="mailto:support@example.com" className="text-primary underline">
              support@example.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
