import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * This is a proper encryption method suitable for production use
 */
async function encryptSecret(secret: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Derive a proper 256-bit key from the encryption key using SHA-256
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(encryptionKey)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  // Generate a random 12-byte IV (recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the secret
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(secret)
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
async function decryptSecret(encryptedSecret: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Derive the same 256-bit key
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(encryptionKey)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  // Decode base64 and extract IV + encrypted data
  const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encryptedData
  );
  
  return decoder.decode(decryptedData);
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

    // SECURITY: Only company OWNERS or super admins can manage payment settings
    // This is more restrictive than regular admin access for sensitive payment credentials
    
    // First check if user is super admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!userRole;

    if (!isSuperAdmin) {
      // Check if user is the company OWNER (not just admin)
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("owner_id")
        .eq("id", company_id)
        .single();

      if (companyError || !company) {
        throw new Error("Company not found");
      }

      if (company.owner_id !== user.id) {
        throw new Error("Only company owners or super admins can manage payment settings. Contact your company owner.");
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
