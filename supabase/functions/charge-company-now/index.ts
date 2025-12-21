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

interface ChargeRequest {
  companyId: string;
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

    const { companyId } = await req.json() as ChargeRequest;
    
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
      .select('id, name, email, subscription_plan, subscription_status, square_customer_id, square_card_id')
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

    const planPrice = PLAN_PRICES[company.subscription_plan || 'starter'] || PLAN_PRICES.starter;
    
    console.log(`Charging company ${company.name} for ${company.subscription_plan}: $${planPrice / 100}`);

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
          amount: planPrice,
          currency: 'USD',
        },
        customer_id: company.square_customer_id,
        location_id: locationId,
        reference_id: companyId,
        note: `Manual subscription payment - ${company.subscription_plan} plan`,
        autocomplete: true,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.errors) {
      console.error('Payment failed:', paymentData.errors);
      
      // Record failed payment
      await supabase.from('billing_history').insert({
        company_id: companyId,
        amount: planPrice,
        status: 'failed',
        description: `Failed: Manual ${company.subscription_plan} plan payment`,
      });

      const errorMessage = paymentData.errors?.[0]?.detail || 'Payment failed';
      return new Response(
        JSON.stringify({ error: errorMessage, details: paymentData.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment successful:', paymentData.payment.id);

    // Update company subscription status
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    await supabase
      .from('companies')
      .update({ 
        subscription_status: 'active',
        trial_ends_at: nextBillingDate.toISOString(),
      })
      .eq('id', companyId);

    // Record successful payment
    await supabase.from('billing_history').insert({
      company_id: companyId,
      amount: planPrice,
      status: 'succeeded',
      square_payment_id: paymentData.payment.id,
      description: `${company.subscription_plan} plan subscription`,
    });

    // Send payment success email
    try {
      await supabase.functions.invoke('send-billing-email', {
        body: {
          type: 'payment_success',
          email: company.email,
          companyName: company.name,
          amount: planPrice,
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
        amount: planPrice,
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