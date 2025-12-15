import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

// Pages that are always accessible even when payment is overdue
const ALLOWED_ROUTES_WHEN_BLOCKED = ['/admin/billing', '/admin/settings'];

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Super admins always have access
      if (isSuperAdmin) {
        setHasAccess(true);
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
          // Calculate days overdue
          const days = Math.floor((now.getTime() - trialEndsAt!.getTime()) / (1000 * 60 * 60 * 24));
          setDaysOverdue(days);
          
          // Check if current route is allowed
          const isAllowedRoute = ALLOWED_ROUTES_WHEN_BLOCKED.some(route => 
            location.pathname.startsWith(route)
          );
          
          if (isAllowedRoute) {
            setHasAccess(true);
            setIsBlocked(false);
          } else {
            setHasAccess(false);
            setIsBlocked(true);
          }
        } else {
          setHasAccess(true);
          setIsBlocked(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasAccess(true); // Allow access on error to prevent lockout
      }

      setIsLoading(false);
    };

    checkSubscription();
  }, [user, navigate, location.pathname, isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show blocked page overlay
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/30 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Restricted</CardTitle>
            <CardDescription className="text-base">
              Your payment is overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Access to this page is restricted</p>
                  <p>Your trial period has ended and no active subscription is on file. Please update your payment method to restore full access to your account.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/admin/billing" className="block">
                <Button className="w-full" size="lg">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Payment Method
                </Button>
              </Link>
              
              <p className="text-xs text-center text-muted-foreground">
                Your data is safe. Once payment is updated, you'll have full access again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
