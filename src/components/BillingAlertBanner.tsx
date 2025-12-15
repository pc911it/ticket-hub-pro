import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BillingInfo {
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
  daysUntilDue: number;
  isOverdue: boolean;
  isTrialExpiring: boolean;
}

export function BillingAlertBanner() {
  const { user, isSuperAdmin } = useAuth();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchBillingInfo = async () => {
      if (!user || isSuperAdmin) return;

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data: company } = await supabase
        .from('companies')
        .select('trial_ends_at, subscription_status')
        .eq('id', membership.company_id)
        .single();

      if (!company) return;

      const now = new Date();
      const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
      const daysUntilDue = trialEndsAt 
        ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const isOverdue = trialEndsAt && now > trialEndsAt && company.subscription_status !== 'active';
      const isTrialExpiring = !isOverdue && daysUntilDue <= 3 && daysUntilDue > 0 && company.subscription_status !== 'active';

      setBillingInfo({
        trialEndsAt,
        subscriptionStatus: company.subscription_status,
        daysUntilDue,
        isOverdue: !!isOverdue,
        isTrialExpiring,
      });
    };

    fetchBillingInfo();
  }, [user, isSuperAdmin]);

  if (!billingInfo || isSuperAdmin || isDismissed) return null;
  if (!billingInfo.isOverdue && !billingInfo.isTrialExpiring) return null;

  const isOverdue = billingInfo.isOverdue;

  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg border flex items-center gap-3 animate-slide-up",
        isOverdue 
          ? "bg-destructive/10 border-destructive/30 text-destructive" 
          : "bg-warning/10 border-warning/30 text-warning-foreground"
      )}
    >
      <AlertTriangle className={cn("h-5 w-5 flex-shrink-0", isOverdue ? "text-destructive" : "text-warning")} />
      
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isOverdue ? "text-destructive" : "text-foreground")}>
          {isOverdue 
            ? `Payment overdue! Your access has been restricted.`
            : `Your trial expires in ${billingInfo.daysUntilDue} day${billingInfo.daysUntilDue !== 1 ? 's' : ''}.`
          }
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isOverdue 
            ? 'Update your payment method to restore full access.'
            : 'Add a payment method to continue using all features after your trial ends.'
          }
        </p>
      </div>

      <Link to="/admin/billing">
        <Button 
          size="sm" 
          variant={isOverdue ? "destructive" : "default"}
          className="flex-shrink-0"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {isOverdue ? 'Update Payment' : 'Add Payment'}
        </Button>
      </Link>

      {!isOverdue && (
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
