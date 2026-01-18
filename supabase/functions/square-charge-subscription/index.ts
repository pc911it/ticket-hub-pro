import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices in cents
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  professional: { monthly: 34900, yearly: 299000 }, // $349/mo or $2990/yr
  advanced: { monthly: 89900, yearly: 749000 },     // $899/mo or $7490/yr
  enterprise: { monthly: 0, yearly: 0 },            // Custom pricing - contact sales
};

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
  trial_ends_at: string | null;
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
  
  // Get base price
  const planPrices = PLAN_PRICES[plan] || PLAN_PRICES.professional;
  let basePrice = billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
  
  // Enterprise has custom pricing
  if (plan === 'enterprise' || basePrice === 0) {
    return { amount: 0, description: 'Enterprise - custom pricing', skipCharge: true };
  }
  
  let finalPrice = basePrice;
  let discountDescription = '';
  
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

    if (!accessToken || !locationId) {
      console.error('Missing Square configuration');
      return new Response(
        JSON.stringify({ error: 'Square payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all companies with expired trials or due for billing that have Square payment set up
    const now = new Date().toISOString();
    const { data: companiesData, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, email, subscription_plan, subscription_status, square_customer_id, square_card_id, trial_ends_at, billing_cycle, discount_percentage, discount_fixed_amount, business_config, next_billing_date')
      .in('subscription_status', ['trial', 'active'])
      .not('square_card_id', 'is', null)
      .or(`trial_ends_at.lt.${now},next_billing_date.lt.${now}`);

    if (fetchError) {
      console.error('Failed to fetch companies:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch companies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companies = companiesData as Company[] || [];
    console.log(`Found ${companies.length} companies due for charging`);

    const squareBaseUrl = accessToken.startsWith('sandbox-')
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';

    const results = [];

    for (const company of companies) {
      // Calculate the correct charge amount
      const { amount, description, skipCharge } = await calculateChargeAmount(company, supabase);
      
      if (skipCharge) {
        console.log(`Skipping charge for ${company.name}: ${description}`);
        
        // Update next billing date even for skipped charges
        const nextBillingDate = new Date();
        if (company.billing_cycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
        
        await supabase
          .from('companies')
          .update({
            subscription_status: 'active',
            next_billing_date: nextBillingDate.toISOString(),
          })
          .eq('id', company.id);
        
        results.push({
          companyId: company.id,
          success: true,
          skipped: true,
          reason: description,
        });
        continue;
      }

      console.log(`Charging company ${company.name} (${company.id}): $${amount / 100} - ${description}`);

      try {
        // Create payment using stored card
        const paymentResponse = await fetch(`${squareBaseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Square-Version': '2024-01-18',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotency_key: `sub-${company.id}-${Date.now()}`,
            source_id: company.square_card_id,
            amount_money: {
              amount: amount,
              currency: 'USD',
            },
            customer_id: company.square_customer_id,
            location_id: locationId,
            reference_id: company.id,
            note: description,
            autocomplete: true,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok || paymentData.errors) {
          console.error(`Payment failed for company ${company.id}:`, paymentData.errors);

          // Update company status to indicate payment failure
          await supabase
            .from('companies')
            .update({ subscription_status: 'payment_failed' })
            .eq('id', company.id);

          // Record failed payment in billing history
          await supabase.from('billing_history').insert({
            company_id: company.id,
            amount: amount,
            status: 'failed',
            description: `Failed: ${description}`,
          });

          // Send payment failed email
          try {
            await supabase.functions.invoke('send-billing-email', {
              body: {
                type: 'payment_failed',
                email: company.email,
                companyName: company.name,
                errorMessage: paymentData.errors?.[0]?.detail,
              },
            });
          } catch (emailErr) {
            console.error('Failed to send payment failed email:', emailErr);
          }

          results.push({
            companyId: company.id,
            success: false,
            error: paymentData.errors?.[0]?.detail || 'Payment failed',
          });
          continue;
        }

        console.log(`Payment successful for company ${company.id}:`, paymentData.payment.id);

        // Calculate next billing date based on billing cycle
        const nextBillingDate = new Date();
        if (company.billing_cycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        await supabase
          .from('companies')
          .update({
            subscription_status: 'active',
            trial_ends_at: null, // Clear trial flag
            next_billing_date: nextBillingDate.toISOString(),
          })
          .eq('id', company.id);

        // Record successful payment in billing history
        await supabase.from('billing_history').insert({
          company_id: company.id,
          amount: amount,
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
              amount: amount,
              cardLast4: paymentData.payment.card_details?.card?.last_4,
            },
          });
        } catch (emailErr) {
          console.error('Failed to send payment success email:', emailErr);
        }

        results.push({
          companyId: company.id,
          success: true,
          paymentId: paymentData.payment.id,
          amount: amount,
        });
      } catch (err) {
        console.error(`Error processing company ${company.id}:`, err);
        results.push({
          companyId: company.id,
          success: false,
          error: 'Processing error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Square charge subscription error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});