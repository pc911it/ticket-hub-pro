import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices in USD
const PLAN_PRICES: Record<string, string> = {
  starter: '29.00',
  professional: '79.00',
  enterprise: '199.00',
};

interface CreateOrderRequest {
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

    const { companyId } = await req.json() as CreateOrderRequest;
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating PayPal order for company:', companyId);

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

    const planPrice = PLAN_PRICES[company.subscription_plan || 'starter'] || PLAN_PRICES.starter;
    
    console.log(`Creating order for ${company.name}: $${planPrice}`);

    // Get PayPal access token
    const isProduction = Deno.env.get('PAYPAL_ENVIRONMENT') === 'production';
    const paypalBaseUrl = isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    console.log('Using PayPal environment:', isProduction ? 'production' : 'sandbox');

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

    // Create PayPal order
    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: companyId,
          description: `${company.subscription_plan} plan subscription`,
          amount: {
            currency_code: 'USD',
            value: planPrice,
          },
        }],
        application_context: {
          brand_name: 'Your Company',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paypal-capture-order`,
          cancel_url: `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/admin/billing`,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', orderData);
      return new Response(
        JSON.stringify({ error: 'Failed to create PayPal order', details: orderData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PayPal order created:', orderData.id);

    // Find the approval URL
    const approvalLink = orderData.links?.find((link: any) => link.rel === 'approve');

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        approvalUrl: approvalLink?.href,
        status: orderData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PayPal create order error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
