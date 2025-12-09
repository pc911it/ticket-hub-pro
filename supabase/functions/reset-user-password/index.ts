import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify their identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { userId, newPassword, companyId } = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is a super admin
    const { data: isSuperAdmin } = await adminClient.rpc("is_super_admin", { 
      _user_id: requestingUser.id 
    });

    // If not super admin, check if they are a company admin and the target user is in their company
    if (!isSuperAdmin) {
      if (!companyId) {
        return new Response(
          JSON.stringify({ error: "companyId is required for non-super-admin users" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if requesting user is a company admin or owner
      const { data: isAdmin } = await adminClient.rpc("is_company_admin", { 
        _company_id: companyId, 
        _user_id: requestingUser.id 
      });
      const { data: isOwner } = await adminClient.rpc("is_company_owner", { 
        _company_id: companyId, 
        _user_id: requestingUser.id 
      });

      if (!isAdmin && !isOwner) {
        return new Response(
          JSON.stringify({ error: "Only company admins can reset passwords for their company's users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the target user is in the same company
      const { data: targetUserMember, error: memberError } = await adminClient
        .from("company_members")
        .select("user_id, role")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError || !targetUserMember) {
        return new Response(
          JSON.stringify({ error: "User not found in your company" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent resetting password for admin users (only super admin can do that)
      if (targetUserMember.role === "admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can reset admin passwords" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset the user's password using admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
