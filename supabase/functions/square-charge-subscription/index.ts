import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices in cents
const PLAN_PRICES: Record<string, number> = {
  starter: 2900,      // $29.00
  professional: 7900, // $79.00
  enterprise: 19900,  // $199.00
};

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

    // Get all companies with expired trials that have Square payment set up
    const now = new Date().toISOString();
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, email, subscription_plan, square_customer_id, square_card_id, trial_ends_at')
      .eq('subscription_status', 'trial')
      .not('square_card_id', 'is', null)
      .lt('trial_ends_at', now);

    if (fetchError) {
      console.error('Failed to fetch expired trials:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch companies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredTrials?.length || 0} companies with expired trials to charge`);

    const squareBaseUrl = accessToken.startsWith('sandbox-') 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';

    const results = [];

    for (const company of expiredTrials || []) {
      const planPrice = PLAN_PRICES[company.subscription_plan || 'starter'] || PLAN_PRICES.starter;
      
      console.log(`Charging company ${company.name} (${company.id}) for ${company.subscription_plan}: $${planPrice / 100}`);

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
              amount: planPrice,
              currency: 'USD',
            },
            customer_id: company.square_customer_id,
            location_id: locationId,
            reference_id: company.id,
            note: `Monthly subscription - ${company.subscription_plan} plan`,
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

          results.push({
            companyId: company.id,
            success: false,
            error: paymentData.errors?.[0]?.detail || 'Payment failed',
          });
          continue;
        }

        console.log(`Payment successful for company ${company.id}:`, paymentData.payment.id);

        // Update company subscription status
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await supabase
          .from('companies')
          .update({ 
            subscription_status: 'active',
            trial_ends_at: nextBillingDate.toISOString(),
          })
          .eq('id', company.id);

        results.push({
          companyId: company.id,
          success: true,
          paymentId: paymentData.payment.id,
          amount: planPrice,
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
