import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveCardRequest {
  clientId: string;
  subscriptionId: string;
  cardNonce: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const { clientId, subscriptionId, cardNonce }: SaveCardRequest = await req.json();

    if (!clientId || !subscriptionId || !cardNonce) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, subscriptionId, cardNonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client and subscription details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, email, company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscription, error: subError } = await supabase
      .from('client_subscriptions')
      .select('id, square_customer_id')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const squareBaseUrl = accessToken.startsWith('sandbox-') 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';

    let customerId = subscription.square_customer_id;

    // Create Square customer if doesn't exist
    if (!customerId) {
      console.log(`Creating Square customer for client ${client.full_name}`);
      
      const customerResponse = await fetch(`${squareBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: `client-${clientId}-${Date.now()}`,
          given_name: client.full_name?.split(' ')[0] || 'Customer',
          family_name: client.full_name?.split(' ').slice(1).join(' ') || '',
          email_address: client.email,
          reference_id: clientId,
        }),
      });

      const customerData = await customerResponse.json();

      if (!customerResponse.ok || customerData.errors) {
        console.error('Failed to create Square customer:', customerData.errors);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = customerData.customer.id;
      console.log(`Created Square customer: ${customerId}`);
    }

    // Create card on file
    console.log(`Creating card on file for customer ${customerId}`);
    
    const cardResponse = await fetch(`${squareBaseUrl}/cards`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `card-${subscriptionId}-${Date.now()}`,
        source_id: cardNonce,
        card: {
          customer_id: customerId,
        },
      }),
    });

    const cardData = await cardResponse.json();

    if (!cardResponse.ok || cardData.errors) {
      console.error('Failed to save card:', cardData.errors);
      return new Response(
        JSON.stringify({ error: cardData.errors?.[0]?.detail || 'Failed to save card' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cardId = cardData.card.id;
    const cardLast4 = cardData.card.last_4;
    console.log(`Saved card: ${cardId} (****${cardLast4})`);

    // Update subscription with card info
    const { error: updateError } = await supabase
      .from('client_subscriptions')
      .update({
        square_customer_id: customerId,
        square_card_id: cardId,
        payment_method: 'card_on_file',
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription with card info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cardId,
        cardLast4,
        customerId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Save client card error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
