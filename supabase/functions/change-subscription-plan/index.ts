import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES = {
  starter: 49,
  professional: 99,
  enterprise: 199,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { companyId, newPlan } = await req.json();

    if (!companyId || !newPlan) {
      return new Response(
        JSON.stringify({ error: "Missing companyId or newPlan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate plan
    if (!["starter", "professional", "enterprise"].includes(newPlan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is company owner or super admin
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, owner_id, subscription_plan, subscription_status")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is owner or super admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!roleData;
    const isOwner = company.owner_id === user.id;

    if (!isOwner && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only company owners can change plans" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentPlan = company.subscription_plan || "starter";
    const currentPrice = PLAN_PRICES[currentPlan as keyof typeof PLAN_PRICES] || 49;
    const newPrice = PLAN_PRICES[newPlan as keyof typeof PLAN_PRICES];

    // Determine if upgrade or downgrade
    const isUpgrade = newPrice > currentPrice;
    const isDowngrade = newPrice < currentPrice;

    // Update company plan
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        subscription_plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the plan change in billing history
    await supabase.from("billing_history").insert({
      company_id: companyId,
      amount: 0, // Proration would be calculated here in production
      description: `Plan ${isUpgrade ? "upgraded" : isDowngrade ? "downgraded" : "changed"} from ${currentPlan} to ${newPlan}`,
      status: "completed",
    });

    // Note: In production, you would:
    // 1. Calculate proration based on billing cycle
    // 2. Charge/credit the difference via Square
    // 3. Update Square subscription if applicable

    return new Response(
      JSON.stringify({
        success: true,
        previousPlan: currentPlan,
        newPlan,
        isUpgrade,
        isDowngrade,
        message: isDowngrade 
          ? "Plan downgraded. Your data is preserved - upgrade anytime to regain access to premium features."
          : "Plan upgraded successfully. All new features are now available.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error changing plan:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
