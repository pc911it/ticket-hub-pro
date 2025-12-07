import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PricingPlans } from '@/components/PricingPlans';
import { Clock, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function UpgradePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [daysExpired, setDaysExpired] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!user) return;

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setCompanyId(membership.company_id);
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

  const handleSelectPlan = async (planId: string, isYearly: boolean) => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      // For now, just update the plan and activate subscription
      // This will be replaced with Stripe checkout later
      const { error } = await supabase
        .from('companies')
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
        })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('Subscription activated! Redirecting to dashboard...');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error) {
      toast.error('Failed to activate subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
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
        <div className="max-w-2xl mx-auto mb-12 text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-5 py-2.5 rounded-full mb-6 border border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Trial expired {daysExpired > 0 ? `${daysExpired} day${daysExpired > 1 ? 's' : ''} ago` : 'today'}
            </span>
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Your free trial has ended
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Choose a plan to continue using all features. Your data is safe and will be available once you subscribe.
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
          <PricingPlans
            onSelectPlan={handleSelectPlan}
            showCurrentBadge={false}
          />
        </div>

        {/* Contact */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <p className="text-muted-foreground">
            Need help choosing?{' '}
            <a href="mailto:support@example.com" className="text-primary hover:underline font-medium">
              Contact our team
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
