import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { SquareCardForm } from '@/components/SquareCardForm';
import { PricingPlans, defaultPlans } from '@/components/PricingPlans';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

const BillingSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['billing-company', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return null;

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', membership.company_id)
        .single();

      return company;
    },
    enabled: !!user,
  });

  // Fetch billing history
  const { data: billingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['billing-history', company?.id],
    queryFn: async () => {
      if (!company) return [];
      
      const { data } = await supabase
        .from('billing_history')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!company,
  });

  // Calculate trial days remaining
  const trialDaysRemaining = company?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialActive = company?.subscription_status === 'trial' && trialDaysRemaining > 0;
  const hasPaymentMethod = !!company?.square_card_id;

  // Update card mutation
  const handleCardNonce = async (cardNonce: string) => {
    if (!company) return;
    
    setIsUpdatingCard(true);
    
    try {
      const response = await supabase.functions.invoke('square-create-customer', {
        body: {
          companyId: company.id,
          email: company.email,
          companyName: company.name,
          cardNonce,
        },
      });

      if (response.error || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to update payment method');
      }

      toast({
        title: 'Payment method updated',
        description: `Card ending in ${response.data.last4} is now on file.`,
      });

      setShowUpdateCard(false);
      queryClient.invalidateQueries({ queryKey: ['billing-company'] });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err.message || 'Could not update payment method.',
      });
    } finally {
      setIsUpdatingCard(false);
    }
  };

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      if (!company) throw new Error('No company found');
      
      const { error } = await supabase
        .from('companies')
        .update({ subscription_plan: newPlan })
        .eq('id', company.id);

      if (error) throw error;
      return newPlan;
    },
    onSuccess: (newPlan) => {
      toast({
        title: 'Plan updated',
        description: `You're now on the ${newPlan} plan. Changes take effect next billing cycle.`,
      });
      setShowChangePlan(false);
      queryClient.invalidateQueries({ queryKey: ['billing-company'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update plan',
        description: error.message,
      });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found');
      
      const { error } = await supabase
        .from('companies')
        .update({ subscription_status: 'cancelled' })
        .eq('id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription has been cancelled. You can reactivate anytime.',
      });
      queryClient.invalidateQueries({ queryKey: ['billing-company'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel',
        description: error.message,
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Trial</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Cancelled</Badge>;
      case 'payment_failed':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentPlan = defaultPlans.find(p => p.id === company?.subscription_plan) || defaultPlans[0];

  if (companyLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No company found</AlertTitle>
          <AlertDescription>You need to be a member of a company to access billing settings.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">Free Trial Active</AlertTitle>
          <AlertDescription className="text-blue-600">
            You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining in your trial.
            {!hasPaymentMethod && ' Add a payment method to avoid interruption when your trial ends.'}
          </AlertDescription>
        </Alert>
      )}

      {company.subscription_status === 'payment_failed' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>
            Your last payment failed. Please update your payment method to restore full access.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{currentPlan.name}</p>
                <p className="text-muted-foreground">${currentPlan.monthlyPrice}/month</p>
              </div>
              {getStatusBadge(company.subscription_status || 'trial')}
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              {currentPlan.features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">Change Plan</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Change Your Plan</DialogTitle>
                  <DialogDescription>Select a new plan. Changes take effect next billing cycle.</DialogDescription>
                </DialogHeader>
                <PricingPlans 
                  currentPlan={company.subscription_plan || 'starter'}
                  onSelectPlan={(planId) => changePlanMutation.mutate(planId)}
                  variant="compact"
                />
              </DialogContent>
            </Dialog>

            {company.subscription_status !== 'cancelled' && (
              <div className="space-y-2">
                {company.subscription_status === 'trial' && (
                  <p className="text-xs text-destructive text-center">
                    Cancellation fee: ${currentPlan.monthlyPrice} (one month)
                  </p>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {company.subscription_status === 'trial' 
                    ? `Cancel & Pay $${currentPlan.monthlyPrice} Fee`
                    : 'Cancel Subscription'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>Your card on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPaymentMethod ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Card on file</p>
                  <p className="text-sm text-muted-foreground">
                    Will be charged after trial ends
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-700">No payment method</p>
                  <p className="text-sm text-yellow-600">
                    Add a card to continue after your trial
                  </p>
                </div>
              </div>
            )}

            <Dialog open={showUpdateCard} onOpenChange={setShowUpdateCard}>
              <DialogTrigger asChild>
                <Button variant={hasPaymentMethod ? "outline" : "default"} className="w-full">
                  {hasPaymentMethod ? 'Update Card' : 'Add Payment Method'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{hasPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}</DialogTitle>
                  <DialogDescription>Enter your card details securely via Square</DialogDescription>
                </DialogHeader>
                <SquareCardForm 
                  onCardNonce={handleCardNonce}
                  isLoading={isUpdatingCard}
                  buttonText={hasPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
                />
              </DialogContent>
            </Dialog>

            {company.trial_ends_at && (
              <div className="text-sm text-muted-foreground">
                {isTrialActive ? (
                  <p>Next billing date: {format(new Date(company.trial_ends_at), 'MMMM d, yyyy')}</p>
                ) : (
                  <p>Trial ended: {format(new Date(company.trial_ends_at), 'MMMM d, yyyy')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : billingHistory && billingHistory.length > 0 ? (
            <div className="space-y-3">
              {billingHistory.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.status === 'succeeded' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : item.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium">{item.description || 'Subscription payment'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.amount / 100).toFixed(2)}</p>
                    <Badge variant={item.status === 'succeeded' ? 'default' : 'destructive'} className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No billing history yet</p>
              <p className="text-sm">Transactions will appear here after your first payment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettingsPage;
