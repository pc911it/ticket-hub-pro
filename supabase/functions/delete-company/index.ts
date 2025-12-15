import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Subscription plan monthly costs in cents
const PLAN_COSTS: Record<string, number> = {
  starter: 2900,      // $29
  professional: 7900, // $79
  enterprise: 19900,  // $199
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const squareAccessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const squareLocationId = Deno.env.get("SQUARE_LOCATION_ID");

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create supabase client with user's token to check permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, reason } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "Company ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is super admin or company owner
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: user.id });
    
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .is("deleted_at", null)
      .single();

    if (companyError || !company) {
      console.error("Company not found:", companyError);
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOwner = company.owner_id === user.id;

    if (!isSuperAdmin && !isOwner) {
      console.error("User is not authorized to delete this company");
      return new Response(JSON.stringify({ error: "Not authorized to delete this company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing deletion for company: ${company.name} (${company_id})`);

    // Calculate cancellation fee (one month of subscription)
    const subscriptionPlan = company.subscription_plan || "starter";
    const cancellationFeeAmount = PLAN_COSTS[subscriptionPlan] || PLAN_COSTS.starter;

    console.log(`Cancellation fee: $${cancellationFeeAmount / 100} for plan: ${subscriptionPlan}`);

    let feeCharged = false;
    let chargeError: string | null = null;

    // Charge cancellation fee if company has Square payment info
    if (company.square_customer_id && company.square_card_id && squareAccessToken && squareLocationId) {
      console.log("Attempting to charge cancellation fee via Square...");
      
      try {
        const idempotencyKey = crypto.randomUUID();
        
        const paymentResponse = await fetch("https://connect.squareup.com/v2/payments", {
          method: "POST",
          headers: {
            "Square-Version": "2024-01-18",
            "Authorization": `Bearer ${squareAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_id: company.square_card_id,
            idempotency_key: idempotencyKey,
            amount_money: {
              amount: cancellationFeeAmount,
              currency: "USD",
            },
            customer_id: company.square_customer_id,
            location_id: squareLocationId,
            note: `Cancellation fee for ${company.name}`,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (paymentResponse.ok && paymentData.payment) {
          console.log("Cancellation fee charged successfully:", paymentData.payment.id);
          feeCharged = true;

          // Record in billing history
          await supabaseAdmin.from("billing_history").insert({
            company_id: company_id,
            amount: cancellationFeeAmount,
            currency: "USD",
            status: "completed",
            description: `Cancellation fee - ${subscriptionPlan} plan`,
            square_payment_id: paymentData.payment.id,
          });
        } else {
          console.error("Failed to charge cancellation fee:", paymentData);
          chargeError = paymentData.errors?.[0]?.detail || "Payment failed";
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error charging cancellation fee:", err);
        chargeError = errorMessage;
      }
    } else {
      console.log("No payment method on file, skipping cancellation fee charge");
      // Still allow deletion but note that fee was not charged
      chargeError = "No payment method on file";
    }

    // Perform soft delete of company
    const { error: deleteError } = await supabaseAdmin
      .from("companies")
      .update({
        deleted_at: new Date().toISOString(),
        cancellation_fee_charged: feeCharged,
        cancellation_reason: reason || "User requested deletion",
        is_active: false,
        subscription_status: "cancelled",
      })
      .eq("id", company_id);

    if (deleteError) {
      console.error("Failed to delete company:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete company" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Company ${company.name} marked as deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company deleted successfully",
        fee_charged: feeCharged,
        fee_amount: cancellationFeeAmount / 100,
        charge_error: chargeError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in delete-company function:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
