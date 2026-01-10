import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChargeInvoiceRequest {
  invoiceId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoiceId } = (await req.json()) as ChargeInvoiceRequest;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoice with client and company info
    const { data: invoice, error: invoiceError } = await supabase
      .from("client_invoices")
      .select(`
        *,
        clients (
          id,
          full_name,
          email,
          square_customer_id,
          square_card_id
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invoice.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Invoice is already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = invoice.clients;
    if (!client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company's payment settings
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("company_payment_settings")
      .select("*")
      .eq("company_id", invoice.company_id)
      .eq("is_enabled", true);

    if (settingsError || !paymentSettings || paymentSettings.length === 0) {
      return new Response(
        JSON.stringify({ error: "No payment provider configured for this company. Please configure payment settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client has a card on file
    if (!client.square_card_id && !client.square_customer_id) {
      return new Response(
        JSON.stringify({ error: "Client does not have a payment method on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find Square settings (prioritize Square for now as it's already integrated)
    const squareSettings = paymentSettings.find(s => s.provider === "square");
    const stripeSettings = paymentSettings.find(s => s.provider === "stripe");

    if (squareSettings && client.square_card_id) {
      // Use company's Square credentials
      const squareAccessToken = squareSettings.square_access_token_encrypted;
      const squareLocationId = squareSettings.square_location_id;
      const squareEnvironment = squareSettings.square_environment || "sandbox";

      if (!squareAccessToken || !squareLocationId) {
        return new Response(
          JSON.stringify({ error: "Square is not fully configured. Please complete the setup in Payment Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const squareBaseUrl = squareEnvironment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

      // Create payment with Square
      const paymentResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${squareAccessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify({
          source_id: client.square_card_id,
          idempotency_key: `invoice-${invoiceId}-${Date.now()}`,
          amount_money: {
            amount: invoice.amount, // Amount in cents
            currency: invoice.currency || "USD",
          },
          customer_id: client.square_customer_id,
          location_id: squareLocationId,
          note: `Invoice ${invoice.invoice_number}`,
          reference_id: invoiceId,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok || paymentResult.errors) {
        const errorMessage = paymentResult.errors?.[0]?.detail || "Payment failed";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update invoice status
      const { error: updateError } = await supabase
        .from("client_invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "square",
          square_payment_id: paymentResult.payment?.id,
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Failed to update invoice:", updateError);
      }

      // Record payment
      await supabase
        .from("client_payments")
        .insert({
          client_id: client.id,
          company_id: invoice.company_id,
          invoice_id: invoiceId,
          amount: invoice.amount,
          currency: invoice.currency || "USD",
          payment_method: "square",
          square_payment_id: paymentResult.payment?.id,
          status: "completed",
          description: `Payment for invoice ${invoice.invoice_number}`,
        });

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: paymentResult.payment?.id,
          message: "Payment processed successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (stripeSettings) {
      // Stripe integration - to be implemented
      return new Response(
        JSON.stringify({ error: "Stripe charging not yet implemented. Please use Square." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "No compatible payment method found for this client" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error charging invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
