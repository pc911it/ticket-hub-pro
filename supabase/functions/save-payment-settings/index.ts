import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using base64 encoding with a salt (production should use proper encryption)
function encryptSecret(secret: string, salt: string): string {
  const combined = `${salt}:${secret}:${salt}`;
  return btoa(combined);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user's auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { 
      company_id, 
      provider, 
      is_enabled,
      stripe_publishable_key,
      stripe_secret_key,
      stripe_webhook_secret,
      square_application_id,
      square_access_token,
      square_location_id,
      square_environment
    } = body;

    if (!company_id || !provider) {
      throw new Error("Missing required fields: company_id and provider");
    }

    // Verify user is a member of this company with admin role
    const { data: membership, error: memberError } = await supabaseClient
      .from("company_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", company_id)
      .single();

    if (memberError || !membership) {
      throw new Error("User is not a member of this company");
    }

    if (membership.role !== "admin") {
      // Check if user is company owner
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("owner_id")
        .eq("id", company_id)
        .single();

      if (companyError || company?.owner_id !== user.id) {
        // Check if user is super admin
        const { data: userRole, error: roleError } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (roleError || !userRole) {
          throw new Error("Only company admins, owners, or super admins can update payment settings");
        }
      }
    }

    // Generate a unique salt for this company
    const encryptionSalt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 32) || "default_salt";

    // Prepare the data with encrypted secrets
    const settingsData: Record<string, any> = {
      company_id,
      provider,
      is_enabled: is_enabled ?? false,
    };

    if (provider === "stripe") {
      settingsData.stripe_publishable_key = stripe_publishable_key || null;
      
      // Only encrypt and update if a new secret is provided (not masked)
      if (stripe_secret_key && !stripe_secret_key.includes("•")) {
        settingsData.stripe_secret_key_encrypted = encryptSecret(stripe_secret_key, encryptionSalt);
      }
      
      if (stripe_webhook_secret && !stripe_webhook_secret.includes("•")) {
        settingsData.stripe_webhook_secret_encrypted = encryptSecret(stripe_webhook_secret, encryptionSalt);
      }
    } else if (provider === "square") {
      settingsData.square_application_id = square_application_id || null;
      settingsData.square_location_id = square_location_id || null;
      settingsData.square_environment = square_environment || "sandbox";
      
      // Only encrypt and update if a new token is provided (not masked)
      if (square_access_token && !square_access_token.includes("•")) {
        settingsData.square_access_token_encrypted = encryptSecret(square_access_token, encryptionSalt);
      }
    }

    // Check if settings already exist
    const { data: existing, error: fetchError } = await supabaseClient
      .from("company_payment_settings")
      .select("id")
      .eq("company_id", company_id)
      .eq("provider", provider)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to check existing settings: ${fetchError.message}`);
    }

    let result;
    if (existing) {
      // Update existing settings
      const { data, error } = await supabaseClient
        .from("company_payment_settings")
        .update(settingsData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update settings: ${error.message}`);
      result = data;
    } else {
      // Insert new settings
      const { data, error } = await supabaseClient
        .from("company_payment_settings")
        .insert(settingsData)
        .select()
        .single();

      if (error) throw new Error(`Failed to create settings: ${error.message}`);
      result = data;
    }

    // Log the security audit
    await supabaseClient
      .from("security_audit_log")
      .insert({
        company_id,
        user_id: user.id,
        event_type: "payment_settings_updated",
        event_details: {
          provider,
          action: existing ? "update" : "create",
          is_enabled,
        },
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown",
      });

    // Return success but mask sensitive fields
    const maskedResult = {
      ...result,
      stripe_secret_key_encrypted: result.stripe_secret_key_encrypted ? "••••••••" : null,
      stripe_webhook_secret_encrypted: result.stripe_webhook_secret_encrypted ? "••••••••" : null,
      square_access_token_encrypted: result.square_access_token_encrypted ? "••••••••" : null,
    };

    return new Response(
      JSON.stringify({ success: true, data: maskedResult }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error saving payment settings:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
