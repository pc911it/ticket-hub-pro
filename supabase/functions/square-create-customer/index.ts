import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCustomerRequest {
  companyId: string;
  email: string;
  companyName: string;
  cardNonce: string;
  postalCode?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    const { companyId, email, companyName, cardNonce, postalCode } = await req.json() as CreateCustomerRequest;
    
    console.log('Creating Square customer for company:', companyId);

    // Determine environment (sandbox vs production)
    const squareBaseUrl = accessToken.startsWith('sandbox-') 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';

    // Step 1: Create Square customer
    const customerResponse = await fetch(`${squareBaseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `customer-${companyId}-${Date.now()}`,
        email_address: email,
        company_name: companyName,
        reference_id: companyId,
      }),
    });

    const customerData = await customerResponse.json();
    
    if (!customerResponse.ok || customerData.errors) {
      console.error('Failed to create Square customer:', customerData);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment customer', details: customerData.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = customerData.customer.id;
    console.log('Created Square customer:', customerId);

    // Step 2: Create card on file for the customer
    const cardResponse = await fetch(`${squareBaseUrl}/cards`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `card-${companyId}-${Date.now()}`,
        source_id: cardNonce,
        card: {
          customer_id: customerId,
          billing_address: postalCode ? { postal_code: postalCode } : undefined,
        },
      }),
    });

    const cardData = await cardResponse.json();
    
    if (!cardResponse.ok || cardData.errors) {
      console.error('Failed to save card:', cardData);
      // Still proceed - customer was created, card failed
      return new Response(
        JSON.stringify({ 
          error: 'Card could not be saved. Please try a different card.',
          details: cardData.errors,
          customerId,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cardId = cardData.card.id;
    const last4 = cardData.card.last_4;
    const cardBrand = cardData.card.card_brand;
    console.log('Saved card on file:', cardId, `(${cardBrand} ****${last4})`);

    // Step 3: Update company with Square IDs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        square_customer_id: customerId,
        square_card_id: cardId,
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Failed to update company with Square IDs:', updateError);
      // Don't fail - Square setup succeeded
    }

    console.log('Successfully set up Square payment for company:', companyId);

    return new Response(
      JSON.stringify({
        success: true,
        customerId,
        cardId,
        last4,
        cardBrand,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Square create customer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
