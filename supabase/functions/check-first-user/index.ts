import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if any super_admin exists in user_roles table
    const { count, error } = await adminClient
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");

    if (error) {
      console.error("Error checking super admin existence:", error);
      throw error;
    }

    const isFirstUser = count === 0;

    console.log(`First user check: isFirstUser=${isFirstUser}, superAdminCount=${count}`);

    return new Response(
      JSON.stringify({ isFirstUser }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-first-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to check first user status",
        isFirstUser: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
