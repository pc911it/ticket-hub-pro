import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user's company
        const { data: membership } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          setHasAccess(true); // No company yet, allow access to complete registration
          setIsLoading(false);
          return;
        }

        // Check company subscription status
        const { data: company } = await supabase
          .from('companies')
          .select('subscription_status, trial_ends_at')
          .eq('id', membership.company_id)
          .single();

        if (!company) {
          setHasAccess(true);
          setIsLoading(false);
          return;
        }

        const now = new Date();
        const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
        const isTrialExpired = trialEndsAt && now > trialEndsAt;
        const hasActiveSubscription = company.subscription_status === 'active';

        if (isTrialExpired && !hasActiveSubscription) {
          navigate('/upgrade', { replace: true });
          setHasAccess(false);
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasAccess(true); // Allow access on error to prevent lockout
      }

      setIsLoading(false);
    };

    checkSubscription();
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
