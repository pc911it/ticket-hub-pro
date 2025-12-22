import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices in cents
const PLAN_PRICES: Record<string, number> = {
  starter: 2900,
  professional: 7900,
  enterprise: 19900,
};

interface CaptureRequest {
  orderId: string;
  companyId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('Missing PayPal configuration');
      return new Response(
        JSON.stringify({ error: 'PayPal payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, companyId } = await req.json() as CaptureRequest;
    
    if (!orderId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Order ID and Company ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Capturing PayPal order:', orderId, 'for company:', companyId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company details
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, email, subscription_plan')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      console.error('Company not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    const isProduction = Deno.env.get('PAYPAL_ENVIRONMENT') === 'production';
    const paypalBaseUrl = isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('PayPal auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'PayPal authentication failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await authResponse.json();

    // Capture the order
    const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
      console.error('PayPal capture failed:', captureData);
      
      // Record failed payment
      const planPrice = PLAN_PRICES[company.subscription_plan || 'starter'] || PLAN_PRICES.starter;
      await supabase.from('billing_history').insert({
        company_id: companyId,
        amount: planPrice,
        status: 'failed',
        description: `Failed: PayPal ${company.subscription_plan} plan payment`,
      });

      return new Response(
        JSON.stringify({ error: 'Payment capture failed', details: captureData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PayPal payment captured:', captureData.id);

    const planPrice = PLAN_PRICES[company.subscription_plan || 'starter'] || PLAN_PRICES.starter;
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

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
      square_payment_id: captureId, // Using this field for PayPal capture ID too
      description: `${company.subscription_plan} plan subscription (PayPal)`,
    });

    // Send payment success email
    try {
      await supabase.functions.invoke('send-billing-email', {
        body: {
          type: 'payment_success',
          email: company.email,
          companyName: company.name,
          amount: planPrice,
          cardLast4: 'PayPal',
        },
      });
    } catch (emailErr) {
      console.error('Failed to send payment success email:', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId,
        amount: planPrice,
        nextBillingDate: nextBillingDate.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PayPal capture order error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
