import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeRequest {
  subscriptionId?: string;
  chargeAll?: boolean;
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

    const { subscriptionId, chargeAll }: ChargeRequest = await req.json();

    let subscriptionsToCharge = [];

    if (subscriptionId) {
      // Charge specific subscription
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          clients(full_name, email),
          client_payment_plans(name, amount, billing_interval),
          companies:company_id(name, email)
        `)
        .eq('id', subscriptionId)
        .eq('status', 'active')
        .eq('payment_method', 'card_on_file')
        .not('square_card_id', 'is', null)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Subscription not found or not eligible for card charging' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      subscriptionsToCharge = [data];
    } else if (chargeAll) {
      // Charge all due subscriptions
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          clients(full_name, email),
          client_payment_plans(name, amount, billing_interval),
          companies:company_id(name, email)
        `)
        .eq('status', 'active')
        .eq('payment_method', 'card_on_file')
        .not('square_card_id', 'is', null)
        .lt('current_period_end', now);
      
      if (error) {
        console.error('Failed to fetch due subscriptions:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscriptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      subscriptionsToCharge = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide subscriptionId or chargeAll=true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptionsToCharge.length} subscriptions to charge`);

    const squareBaseUrl = accessToken.startsWith('sandbox-') 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';

    const results = [];

    for (const subscription of subscriptionsToCharge) {
      const amount = subscription.client_payment_plans?.amount || 0;
      const clientName = subscription.clients?.full_name || 'Unknown';
      const clientEmail = subscription.clients?.email;
      const planName = subscription.client_payment_plans?.name || 'Subscription';
      const billingInterval = subscription.client_payment_plans?.billing_interval || 'monthly';
      
      console.log(`Charging subscription ${subscription.id} for client ${clientName}: $${amount / 100}`);

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
            idempotency_key: `client-sub-${subscription.id}-${Date.now()}`,
            source_id: subscription.square_card_id,
            amount_money: {
              amount: amount,
              currency: 'USD',
            },
            customer_id: subscription.square_customer_id,
            location_id: locationId,
            reference_id: subscription.id,
            note: `${planName} - ${clientName}`,
            autocomplete: true,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok || paymentData.errors) {
          console.error(`Payment failed for subscription ${subscription.id}:`, paymentData.errors);
          
          // Update subscription status
          await supabase
            .from('client_subscriptions')
            .update({ status: 'payment_failed' })
            .eq('id', subscription.id);

          // Record failed payment
          await supabase.from('client_payments').insert({
            company_id: subscription.company_id,
            client_id: subscription.client_id,
            subscription_id: subscription.id,
            amount: amount,
            payment_method: 'card_on_file',
            status: 'failed',
            description: `Failed: ${planName} subscription`,
          });

          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: paymentData.errors?.[0]?.detail || 'Payment failed',
          });
          continue;
        }

        console.log(`Payment successful for subscription ${subscription.id}:`, paymentData.payment.id);

        // Calculate next billing period
        const now = new Date();
        let nextPeriodEnd = new Date(now);
        if (billingInterval === 'monthly') {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        } else if (billingInterval === 'yearly') {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        }

        // Update subscription period
        await supabase
          .from('client_subscriptions')
          .update({ 
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: nextPeriodEnd.toISOString(),
          })
          .eq('id', subscription.id);

        // Record successful payment
        await supabase.from('client_payments').insert({
          company_id: subscription.company_id,
          client_id: subscription.client_id,
          subscription_id: subscription.id,
          amount: amount,
          payment_method: 'card_on_file',
          status: 'succeeded',
          square_payment_id: paymentData.payment.id,
          description: `${planName} subscription`,
        });

        // Create invoice for the payment
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        await supabase.from('client_invoices').insert({
          company_id: subscription.company_id,
          client_id: subscription.client_id,
          subscription_id: subscription.id,
          invoice_number: invoiceNumber,
          amount: amount,
          description: `${planName} subscription`,
          due_date: now.toISOString().split('T')[0],
          status: 'paid',
          paid_at: now.toISOString(),
          payment_method: 'card_on_file',
          square_payment_id: paymentData.payment.id,
        });

        results.push({
          subscriptionId: subscription.id,
          success: true,
          paymentId: paymentData.payment.id,
          amount: amount,
        });
      } catch (err) {
        console.error(`Error processing subscription ${subscription.id}:`, err);
        results.push({
          subscriptionId: subscription.id,
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
    console.error('Charge client subscription error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
