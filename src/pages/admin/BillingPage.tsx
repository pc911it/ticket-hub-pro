import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { PricingPlans, defaultPlans } from "@/components/PricingPlans";
import { CreditCard, Calendar, Users, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [changePlanDialog, setChangePlanDialog] = useState<{ planId: string; isYearly: boolean } | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership) return null;

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", membership.company_id)
        .single();

      if (companyError) return null;

      return { ...companyData, userRole: membership.role };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (company?.trial_ends_at && company?.subscription_status === 'trial') {
      const trialEnd = new Date(company.trial_ends_at);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setTrialDaysLeft(Math.max(0, daysLeft));
    } else {
      setTrialDaysLeft(null);
    }
  }, [company]);

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, isYearly }: { planId: string; isYearly: boolean }) => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase
        .from("companies")
        .update({ 
          subscription_plan: planId,
          subscription_status: 'active'
        })
        .eq("id", company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      const plan = defaultPlans.find(p => p.id === changePlanDialog?.planId);
      toast.success(`Successfully switched to ${plan?.name} plan`);
      setChangePlanDialog(null);
      queryClient.invalidateQueries({ queryKey: ["user-company"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase
        .from("companies")
        .update({ subscription_status: 'cancelled' })
        .eq("id", company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription cancelled. You'll have access until the end of your billing period.");
      setCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ["user-company"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase
        .from("companies")
        .update({ subscription_status: 'active' })
        .eq("id", company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription reactivated!");
      queryClient.invalidateQueries({ queryKey: ["user-company"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currentPlan = defaultPlans.find(p => p.id === company?.subscription_plan) || defaultPlans[0];
  const isOwnerOrAdmin = company?.owner_id === user?.id || company?.userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No company found. Please register a company first.</p>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Only company owners and admins can manage billing.</p>
      </div>
    );
  }

  const handleSelectPlan = (planId: string, isYearly: boolean) => {
    if (planId === company.subscription_plan) return;
    setChangePlanDialog({ planId, isYearly });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your company's subscription plan</p>
      </div>

      {/* Trial Banner */}
      {trialDaysLeft !== null && trialDaysLeft > 0 && (
        <Card className="border-secondary/50 bg-secondary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">Trial Period</p>
                  <p className="text-sm text-muted-foreground">
                    {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              </div>
              <div className="flex-1 max-w-xs hidden sm:block">
                <Progress value={((14 - trialDaysLeft) / 14) * 100} className="h-2" />
              </div>
              <Badge variant="secondary">Free Trial</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan.name}</div>
            <p className="text-sm text-muted-foreground">
              ${currentPlan.monthlyPrice}/month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={
                company.subscription_status === 'active' ? 'default' :
                company.subscription_status === 'trial' ? 'secondary' :
                'destructive'
              }>
                {company.subscription_status === 'trial' ? 'Free Trial' : 
                 company.subscription_status?.charAt(0).toUpperCase() + company.subscription_status?.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {company.subscription_status === 'trial' 
                ? `Trial ends in ${trialDaysLeft} days` 
                : 'Renews monthly'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{company.name}</div>
            <p className="text-sm text-muted-foreground capitalize">
              {company.type?.replace('_', ' ')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Warning */}
      {company.subscription_status === 'cancelled' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Your subscription has been cancelled. Reactivate to keep your access.</span>
            <Button 
              size="sm" 
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              Reactivate
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-6">Available Plans</h2>
        <PricingPlans
          currentPlan={company.subscription_plan || 'starter'}
          onSelectPlan={handleSelectPlan}
          variant="compact"
        />
      </div>

      {/* Cancel Subscription */}
      {company.subscription_status !== 'cancelled' && company.subscription_status !== 'trial' && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Cancel Subscription</CardTitle>
            <CardDescription>
              Cancel your subscription. You'll retain access until the end of your current billing period.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              variant="outline" 
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setCancelDialog(true)}
            >
              Cancel Subscription
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanDialog} onOpenChange={() => setChangePlanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              {changePlanDialog && (() => {
                const newPlan = defaultPlans.find(p => p.id === changePlanDialog.planId);
                const currentIndex = defaultPlans.findIndex(p => p.id === company.subscription_plan);
                const newIndex = defaultPlans.findIndex(p => p.id === changePlanDialog.planId);
                const isUpgrade = newIndex > currentIndex;
                const price = changePlanDialog.isYearly 
                  ? Math.round((newPlan?.yearlyPrice || 0) / 12)
                  : newPlan?.monthlyPrice;

                return isUpgrade 
                  ? `Upgrade to ${newPlan?.name} for $${price}/month. You'll be charged the prorated difference immediately.`
                  : `Downgrade to ${newPlan?.name} for $${price}/month. The change will take effect at your next billing cycle.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => changePlanDialog && updatePlanMutation.mutate(changePlanDialog)}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? 'Processing...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel? You'll lose access to premium features at the end of your billing period. You can reactivate anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
