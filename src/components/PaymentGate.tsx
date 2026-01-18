import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Shield, CheckCircle, Building2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SquareCardForm } from "./SquareCardForm";

interface PaymentGateProps {
  children: React.ReactNode;
}

interface CompanyData {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  billing_cycle: string | null;
  business_config: Record<string, any> | null;
  square_card_id: string | null;
}

export function PaymentGate({ children }: PaymentGateProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);

  useEffect(() => {
    if (user) {
      checkPaymentRequirement();
    }
  }, [user]);

  const checkPaymentRequirement = async () => {
    try {
      // Get user's company
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!memberData?.company_id) {
        setIsLoading(false);
        return;
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, subscription_plan, subscription_status, billing_cycle, business_config, square_card_id')
        .eq('id', memberData.company_id)
        .single();

      if (!companyData) {
        setIsLoading(false);
        return;
      }

      setCompany(companyData as CompanyData);

      // Check if payment is required
      const businessConfig = companyData.business_config as Record<string, any> | null;
      const requireCardBeforeAccess = businessConfig?.require_card_before_access === true;
      const isPendingPayment = companyData.subscription_status === 'pending_payment';
      const hasCard = !!companyData.square_card_id;

      // If require_card_before_access is set and status is pending_payment and no card
      if (requireCardBeforeAccess && isPendingPayment && !hasCard) {
        setRequiresPayment(true);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error checking payment requirement:', error);
      setIsLoading(false);
    }
  };

  const handleCardNonce = async (nonce: string) => {
    if (!company) return;
    
    setIsSavingCard(true);
    
    try {
      // First save the card
      const saveResponse = await supabase.functions.invoke('save-payment-settings', {
        body: {
          companyId: company.id,
          sourceId: nonce,
        },
      });

      if (saveResponse.error || !saveResponse.data?.success) {
        throw new Error(saveResponse.data?.error || 'Failed to save card');
      }

      toast.success("Card saved successfully!");
      setIsSavingCard(false);
      setIsProcessingPayment(true);

      // Now charge the card immediately
      const chargeResponse = await supabase.functions.invoke('charge-company-now', {
        body: {
          companyId: company.id,
        },
      });

      if (chargeResponse.error || !chargeResponse.data?.success) {
        throw new Error(chargeResponse.data?.error || 'Payment failed');
      }

      toast.success("Payment successful!", {
        description: "Your account is now active. Welcome aboard!"
      });

      // Refresh the page to show dashboard
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error("Payment failed", {
        description: error.message || "Please try again or contact support."
      });
      setIsProcessingPayment(false);
      setIsSavingCard(false);
    }
  };

  const getPlanPrice = () => {
    const prices: Record<string, { monthly: number; yearly: number }> = {
      professional: { monthly: 349, yearly: 2990 },
      advanced: { monthly: 899, yearly: 7490 },
    };
    
    const plan = company?.subscription_plan || 'professional';
    const cycle = company?.billing_cycle || 'monthly';
    const planPrices = prices[plan] || prices.professional;
    
    if (cycle === 'yearly') {
      return { amount: Math.round(planPrices.yearly / 12), billed: planPrices.yearly, cycle: 'year' };
    }
    return { amount: planPrices.monthly, billed: planPrices.monthly, cycle: 'month' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!requiresPayment) {
    return <>{children}</>;
  }

  const pricing = getPlanPrice();
  const businessConfig = company?.business_config as Record<string, any> | null;
  const discount = businessConfig?.discount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to {company?.name}</h1>
          <p className="text-muted-foreground mt-2">
            Complete your setup to access your dashboard
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="secondary" className="capitalize">
                <Sparkles className="h-3 w-3 mr-1" />
                {company?.subscription_plan} Plan
              </Badge>
              {company?.billing_cycle === 'yearly' && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Annual Billing
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl">
              ${pricing.amount}
              <span className="text-lg font-normal text-muted-foreground">/mo</span>
            </CardTitle>
            <CardDescription>
              {company?.billing_cycle === 'yearly' 
                ? `Billed annually at $${pricing.billed}/year` 
                : 'Billed monthly'}
            </CardDescription>
            {discount && (
              <Badge className="mt-2 bg-green-100 text-green-700">
                {discount.type === 'percentage' ? `${discount.value}% OFF` : `$${discount.value} OFF`}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {!isProcessingPayment && !isSavingCard ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Unlimited access to all features</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Priority support included</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Cancel anytime, no contracts</span>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Add Payment Method</h3>
                  </div>
                  
                  <SquareCardForm
                    onCardNonce={handleCardNonce}
                    buttonText="Add Card & Activate Account"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Shield className="h-3 w-3" />
                  <span>Your payment info is encrypted and secure</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="font-medium">
                  {isSavingCard ? "Saving your card..." : "Processing your payment..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please don't close this window
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          <br />
          Need help? Contact support@builderflow.com
        </p>
      </div>
    </div>
  );
}
