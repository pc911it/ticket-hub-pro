import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Zap, Shield, Users, CreditCard, Calendar, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

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

export default function BillingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [changePlanDialog, setChangePlanDialog] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get company membership
      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership) return null;

      // Then get company details
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

  const updatePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      if (!company?.id) throw new Error("No company found");

      const { error } = await supabase
        .from("companies")
        .update({ 
          subscription_plan: newPlan,
          subscription_status: 'active'
        })
        .eq("id", company.id);

      if (error) throw error;
    },
    onSuccess: (_, newPlan) => {
      const plan = plans.find(p => p.id === newPlan);
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

  const currentPlan = plans.find(p => p.id === company?.subscription_plan) || plans[0];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your company's subscription plan</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan.name}</div>
            <p className="text-xs text-muted-foreground">
              ${currentPlan.price}/month
            </p>
          </CardContent>
        </Card>
        <Card>
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
                {company.subscription_status === 'trial' ? '14-Day Trial' : 
                 company.subscription_status?.charAt(0).toUpperCase() + company.subscription_status?.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {company.subscription_status === 'trial' ? 'Trial ends in 14 days' : 'Renews monthly'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{company.name}</div>
            <p className="text-xs text-muted-foreground capitalize">
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
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === company.subscription_plan;
            const currentIndex = plans.findIndex(p => p.id === company.subscription_plan);
            const planIndex = plans.findIndex(p => p.id === plan.id);
            const isUpgrade = planIndex > currentIndex;
            const isDowngrade = planIndex < currentIndex;

            return (
              <Card 
                key={plan.id}
                className={`relative transition-all duration-200 ${
                  isCurrentPlan ? 'ring-2 ring-primary border-primary' : 'hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    isCurrentPlan ? 'bg-primary text-primary-foreground' : 'bg-muted'
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
                        <Check className={`h-4 w-4 ${isCurrentPlan ? 'text-primary' : 'text-muted-foreground'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      variant={isUpgrade ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setChangePlanDialog(plan.id)}
                    >
                      {isUpgrade ? (
                        <>
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Upgrade
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Downgrade
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cancel Subscription */}
      {company.subscription_status !== 'cancelled' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
            <CardDescription>
              Cancel your subscription. You'll retain access until the end of your current billing period.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              variant="destructive" 
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
                const newPlan = plans.find(p => p.id === changePlanDialog);
                const currentIndex = plans.findIndex(p => p.id === company.subscription_plan);
                const newIndex = plans.findIndex(p => p.id === changePlanDialog);
                const isUpgrade = newIndex > currentIndex;

                return isUpgrade 
                  ? `Upgrade to ${newPlan?.name} for $${newPlan?.price}/month. You'll be charged the prorated difference immediately.`
                  : `Downgrade to ${newPlan?.name} for $${newPlan?.price}/month. The change will take effect at your next billing cycle.`;
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
