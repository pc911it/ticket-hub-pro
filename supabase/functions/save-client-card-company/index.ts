import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SaveCardRequest {
  clientId: string;
  cardNonce: string;
  companyId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, cardNonce, companyId } = (await req.json()) as SaveCardRequest;

    if (!clientId || !cardNonce || !companyId) {
      return new Response(
        JSON.stringify({ error: "Client ID, card nonce, and company ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company's Square settings
    const { data: paymentSettings, error: settingsError } = await supabase
      .from("company_payment_settings")
      .select("*")
      .eq("company_id", companyId)
      .eq("provider", "square")
      .eq("is_enabled", true)
      .single();

    if (settingsError || !paymentSettings) {
      return new Response(
        JSON.stringify({ error: "Square is not configured for this company. Please set up Square in Payment Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const squareAccessToken = paymentSettings.square_access_token_encrypted;
    const squareEnvironment = paymentSettings.square_environment || "sandbox";

    if (!squareAccessToken) {
      return new Response(
        JSON.stringify({ error: "Square access token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const squareBaseUrl = squareEnvironment === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name, email, phone, square_customer_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customerId = client.square_customer_id;

    // Create Square customer if doesn't exist
    if (!customerId) {
      const customerResponse = await fetch(`${squareBaseUrl}/v2/customers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${squareAccessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify({
          idempotency_key: `customer-${clientId}-${Date.now()}`,
          email_address: client.email,
          given_name: client.full_name?.split(" ")[0] || "",
          family_name: client.full_name?.split(" ").slice(1).join(" ") || "",
          phone_number: client.phone,
          reference_id: clientId,
        }),
      });

      const customerResult = await customerResponse.json();

      if (!customerResponse.ok || customerResult.errors) {
        const errorMessage = customerResult.errors?.[0]?.detail || "Failed to create customer";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = customerResult.customer?.id;

      // Update client with Square customer ID
      await supabase
        .from("clients")
        .update({ square_customer_id: customerId })
        .eq("id", clientId);
    }

    // Create card on file
    const cardResponse = await fetch(`${squareBaseUrl}/v2/cards`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${squareAccessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify({
        idempotency_key: `card-${clientId}-${Date.now()}`,
        source_id: cardNonce,
        card: {
          customer_id: customerId,
        },
      }),
    });

    const cardResult = await cardResponse.json();

    if (!cardResponse.ok || cardResult.errors) {
      const errorMessage = cardResult.errors?.[0]?.detail || "Failed to save card";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cardId = cardResult.card?.id;
    const cardLast4 = cardResult.card?.last_4;

    // Update client with card ID
    await supabase
      .from("clients")
      .update({ 
        square_card_id: cardId,
        square_customer_id: customerId,
      })
      .eq("id", clientId);

    return new Response(
      JSON.stringify({
        success: true,
        cardId,
        cardLast4,
        customerId,
        message: "Card saved successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error saving card:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
