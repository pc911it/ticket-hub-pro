import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default plan prices in cents (fallback if database fetch fails)
const DEFAULT_PLAN_PRICES: Record<string, { monthly: number; yearly: number; discount_percent: number; discount_fixed_amount: number; discount_valid_until: string | null }> = {
  professional: { monthly: 34900, yearly: 299000, discount_percent: 0, discount_fixed_amount: 0, discount_valid_until: null },
  advanced: { monthly: 89900, yearly: 749000, discount_percent: 0, discount_fixed_amount: 0, discount_valid_until: null },
  enterprise: { monthly: 0, yearly: 0, discount_percent: 0, discount_fixed_amount: 0, discount_valid_until: null },
};

interface PlanPriceData {
  monthly: number;
  yearly: number;
  discount_percent: number;
  discount_fixed_amount: number;
  discount_valid_until: string | null;
}

// Fetch plan prices and discounts from database
async function getPlanPrices(supabase: any): Promise<Record<string, PlanPriceData>> {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, monthly_price, yearly_price, is_custom_pricing, discount_percent, discount_fixed_amount, discount_valid_until");
    
    if (error || !data) {
      console.warn("Failed to fetch plan prices, using defaults:", error);
      return DEFAULT_PLAN_PRICES;
    }
    
    const prices: Record<string, PlanPriceData> = {};
    for (const plan of data) {
      prices[plan.id] = {
        monthly: plan.is_custom_pricing ? 0 : plan.monthly_price,
        yearly: plan.is_custom_pricing ? 0 : plan.yearly_price,
        discount_percent: plan.discount_percent || 0,
        discount_fixed_amount: plan.discount_fixed_amount || 0,
        discount_valid_until: plan.discount_valid_until,
      };
    }
    return prices;
  } catch (err) {
    console.warn("Error fetching plan prices:", err);
    return DEFAULT_PLAN_PRICES;
  }
}

interface ChargeRequest {
  companyId: string;
  overrideAmount?: number; // Optional: allow super admin to charge a specific amount
}

interface BusinessConfig {
  is_free_account?: boolean;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  discounted_price?: number;
}

interface Company {
  id: string;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  square_customer_id: string | null;
  square_card_id: string | null;
  billing_cycle: 'monthly' | 'yearly';
  discount_percentage: number;
  discount_fixed_amount: number;
  business_config: BusinessConfig | null;
}

interface PromoDiscount {
  discount_type: 'percentage' | 'fixed' | 'trial_extension';
  discount_value: number;
  is_recurring: boolean;
}

/**
 * Calculate the actual charge amount for a company considering:
 * - Base plan price (monthly or yearly)
 * - Free accounts (no charge)
 * - Promo code discounts (percentage or fixed)
 * - Super admin discounts
 */
async function calculateChargeAmount(
  company: Company,
  supabase: any
): Promise<{ amount: number; description: string; skipCharge: boolean }> {
  const plan = company.subscription_plan || 'professional';
  const billingCycle = company.billing_cycle || 'monthly';
  
  // Check for free account
  if (company.business_config?.is_free_account) {
    return { amount: 0, description: 'Free account - no charge', skipCharge: true };
  }
  
  // Fetch dynamic prices from database
  const PLAN_PRICES = await getPlanPrices(supabase);
  
  // Get base price
  const planPrices = PLAN_PRICES[plan] || DEFAULT_PLAN_PRICES.professional;
  let basePrice = billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
  
  // Enterprise has custom pricing
  if (plan === 'enterprise' || basePrice === 0) {
    return { amount: 0, description: 'Enterprise - custom pricing', skipCharge: true };
  }
  
  let finalPrice = basePrice;
  let discountDescription = '';
  
  // Apply plan-level discounts (from Plan Management)
  const isPlanDiscountValid = !planPrices.discount_valid_until || new Date(planPrices.discount_valid_until) > new Date();
  if (isPlanDiscountValid) {
    if (planPrices.discount_percent > 0) {
      const discount = Math.round(finalPrice * planPrices.discount_percent / 100);
      finalPrice -= discount;
      discountDescription = ` (${planPrices.discount_percent}% plan discount)`;
    }
    if (planPrices.discount_fixed_amount > 0) {
      finalPrice -= planPrices.discount_fixed_amount;
      discountDescription += ` ($${planPrices.discount_fixed_amount / 100} plan discount)`;
    }
  }
  
  // Check for recurring promo code discounts
  const { data: promoData } = await supabase
    .from('company_promo_codes')
    .select(`
      promo_code_id,
      is_recurring,
      promo_codes (
        discount_type,
        discount_value,
        is_active
      )
    `)
    .eq('company_id', company.id)
    .eq('is_recurring', true)
    .single();
  
  if (promoData?.promo_codes?.is_active && promoData.is_recurring) {
    const promo = promoData.promo_codes as PromoDiscount;
    if (promo.discount_type === 'percentage') {
      const discount = Math.round(finalPrice * promo.discount_value / 100);
      finalPrice -= discount;
      discountDescription = ` (${promo.discount_value}% promo discount applied)`;
    } else if (promo.discount_type === 'fixed') {
      finalPrice -= promo.discount_value * 100; // Convert dollars to cents
      discountDescription = ` ($${promo.discount_value} promo discount applied)`;
    }
  }
  
  // Check for company-level discount columns
  if (company.discount_percentage > 0) {
    const discount = Math.round(finalPrice * company.discount_percentage / 100);
    finalPrice -= discount;
    discountDescription += ` (${company.discount_percentage}% admin discount)`;
  }
  
  if (company.discount_fixed_amount > 0) {
    finalPrice -= company.discount_fixed_amount * 100; // Convert dollars to cents
    discountDescription += ` ($${company.discount_fixed_amount} admin discount)`;
  }
  
  // Check for business_config discount (legacy/super admin applied)
  if (company.business_config?.discount) {
    const discount = company.business_config.discount;
    if (discount.type === 'percentage') {
      const discountAmount = Math.round(finalPrice * discount.value / 100);
      finalPrice -= discountAmount;
      discountDescription += ` (${discount.value}% config discount)`;
    } else if (discount.type === 'fixed') {
      finalPrice -= discount.value * 100;
      discountDescription += ` ($${discount.value} config discount)`;
    }
  }
  
  // Ensure price is never negative
  finalPrice = Math.max(0, finalPrice);
  
  if (finalPrice === 0) {
    return { amount: 0, description: 'Fully discounted - no charge', skipCharge: true };
  }
  
  const cycleLabel = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  return {
    amount: Math.round(finalPrice),
    description: `${plan} plan ${cycleLabel} subscription${discountDescription}`,
    skipCharge: false,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    console.log('Square config - Location ID:', locationId);
    console.log('Square config - Access Token exists:', !!accessToken);

    if (!accessToken || !locationId) {
      console.error('Missing Square configuration');
      return new Response(
        JSON.stringify({ error: 'Square payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { companyId, overrideAmount } = await req.json() as ChargeRequest;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Manual charge requested for company:', companyId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company details
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, email, subscription_plan, subscription_status, square_customer_id, square_card_id, billing_cycle, discount_percentage, discount_fixed_amount, business_config')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      console.error('Company not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company.square_customer_id || !company.square_card_id) {
      console.error('No payment method on file for company:', companyId);
      return new Response(
        JSON.stringify({ error: 'No payment method on file. Please add a card first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate charge amount (or use override if provided)
    let chargeAmount: number;
    let description: string;
    
    if (typeof overrideAmount === 'number' && overrideAmount > 0) {
      chargeAmount = Math.round(overrideAmount * 100); // Convert dollars to cents
      description = `Manual charge - $${overrideAmount}`;
    } else {
      const calculated = await calculateChargeAmount(company as Company, supabase);
      if (calculated.skipCharge) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            reason: calculated.description,
            message: 'No charge required for this account' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      chargeAmount = calculated.amount;
      description = calculated.description;
    }

    console.log(`Charging company ${company.name} for ${description}: $${chargeAmount / 100}`);

    // Determine environment
    const isProduction = Deno.env.get('SQUARE_ENVIRONMENT') === 'production';
    const squareBaseUrl = isProduction
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    console.log('Using Square environment:', isProduction ? 'production' : 'sandbox');

    // Create payment using stored card
    const paymentResponse = await fetch(`${squareBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `m-${companyId.slice(0, 8)}-${Date.now()}`,
        source_id: company.square_card_id,
        amount_money: {
          amount: chargeAmount,
          currency: 'USD',
        },
        customer_id: company.square_customer_id,
        location_id: locationId,
        reference_id: companyId,
        note: description,
        autocomplete: true,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.errors) {
      console.error('Payment failed:', paymentData.errors);

      // Record failed payment
      await supabase.from('billing_history').insert({
        company_id: companyId,
        amount: chargeAmount,
        status: 'failed',
        description: `Failed: ${description}`,
      });

      const errorMessage = paymentData.errors?.[0]?.detail || 'Payment failed';
      return new Response(
        JSON.stringify({ error: errorMessage, details: paymentData.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment successful:', paymentData.payment.id);

    // Calculate next billing date based on billing cycle
    const nextBillingDate = new Date();
    const billingCycle = (company as Company).billing_cycle || 'monthly';
    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    await supabase
      .from('companies')
      .update({
        subscription_status: 'active',
        trial_ends_at: null,
        next_billing_date: nextBillingDate.toISOString(),
      })
      .eq('id', companyId);

    // Record successful payment
    await supabase.from('billing_history').insert({
      company_id: companyId,
      amount: chargeAmount,
      status: 'succeeded',
      square_payment_id: paymentData.payment.id,
      description: description,
    });

    // Send payment success email
    try {
      await supabase.functions.invoke('send-billing-email', {
        body: {
          type: 'payment_success',
          email: company.email,
          companyName: company.name,
          amount: chargeAmount,
          cardLast4: paymentData.payment.card_details?.card?.last_4,
        },
      });
    } catch (emailErr) {
      console.error('Failed to send payment success email:', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.payment.id,
        amount: chargeAmount,
        amountFormatted: `$${(chargeAmount / 100).toFixed(2)}`,
        description: description,
        last4: paymentData.payment.card_details?.card?.last_4,
        nextBillingDate: nextBillingDate.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Charge company error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});