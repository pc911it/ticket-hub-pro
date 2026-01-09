import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeInvoiceRequest {
  invoiceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareLocationId = Deno.env.get('SQUARE_LOCATION_ID');
    
    if (!squareAccessToken || !squareLocationId) {
      console.error('Missing Square configuration');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { invoiceId } = await req.json() as ChargeInvoiceRequest;
    
    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Charging invoice:', invoiceId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invoice with client info
    const { data: invoice, error: fetchError } = await supabase
      .from('client_invoices')
      .select('*, clients(id, full_name, email, square_customer_id, square_card_id)')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('Invoice not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invoice.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Invoice is already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = invoice.clients;
    if (!client?.square_customer_id || !client?.square_card_id) {
      return new Response(
        JSON.stringify({ error: 'Client does not have a card on file. Please add a payment method first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Charging client ${client.full_name} for invoice ${invoice.invoice_number}: $${(invoice.amount / 100).toFixed(2)}`);

    // Charge the client's card via Square
    const isProduction = Deno.env.get('SQUARE_ENVIRONMENT') === 'production';
    const squareBaseUrl = isProduction
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        source_id: client.square_card_id,
        idempotency_key: `invoice-${invoiceId}-${Date.now()}`,
        amount_money: {
          amount: invoice.amount,
          currency: invoice.currency || 'USD',
        },
        customer_id: client.square_customer_id,
        location_id: squareLocationId,
        note: `Invoice ${invoice.invoice_number}`,
        reference_id: invoice.id,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.errors) {
      console.error('Square payment failed:', paymentData);
      const errorMessage = paymentData.errors?.[0]?.detail || 'Payment failed';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment successful:', paymentData.payment.id);

    // Update invoice as paid
    const { error: updateError } = await supabase
      .from('client_invoices')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(),
        payment_method: 'card',
        square_payment_id: paymentData.payment.id,
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
      // Payment went through but DB update failed - log but don't fail
    }

    // Record the payment in client_payments
    await supabase
      .from('client_payments')
      .insert({
        client_id: client.id,
        company_id: invoice.company_id,
        invoice_id: invoiceId,
        amount: invoice.amount,
        currency: invoice.currency || 'USD',
        payment_method: 'card',
        status: 'succeeded',
        square_payment_id: paymentData.payment.id,
        description: `Payment for invoice ${invoice.invoice_number}`,
      });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.payment.id,
        amount: invoice.amount,
        last4: paymentData.payment.card_details?.card?.last_4 || '****',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Charge invoice error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
