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
    
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { userId, companyId } = await req.json();

    if (!userId || !companyId) {
      return new Response(
        JSON.stringify({ error: "userId and companyId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is super admin
    const { data: isSuperAdmin } = await adminClient.rpc("is_super_admin", { 
      _user_id: requestingUser.id 
    });

    // Check if requesting user is a company admin for this company
    const { data: isCompanyAdmin } = await adminClient.rpc("is_company_admin", { 
      _user_id: requestingUser.id,
      _company_id: companyId
    });

    // Check if requesting user is the company owner
    const { data: isCompanyOwner } = await adminClient.rpc("is_company_owner", { 
      _user_id: requestingUser.id,
      _company_id: companyId
    });

    if (!isSuperAdmin && !isCompanyAdmin && !isCompanyOwner) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to delete users from this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent deleting yourself
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user is a company admin/owner - only super admin can delete them
    const { data: targetIsAdmin } = await adminClient.rpc("is_company_admin", { 
      _user_id: userId,
      _company_id: companyId
    });

    const { data: targetIsOwner } = await adminClient.rpc("is_company_owner", { 
      _user_id: userId,
      _company_id: companyId
    });

    if ((targetIsAdmin || targetIsOwner) && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admin can delete company admins or owners" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove from company_members
    const { error: memberError } = await adminClient
      .from("company_members")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", companyId);

    if (memberError) {
      return new Response(
        JSON.stringify({ error: memberError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user belongs to any other companies
    const { data: otherMemberships } = await adminClient
      .from("company_members")
      .select("id")
      .eq("user_id", userId);

    // If super admin and user has no other company memberships, optionally delete the auth user
    if (isSuperAdmin && (!otherMemberships || otherMemberships.length === 0)) {
      // Delete user_roles
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete profile
      await adminClient
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      // Delete auth user
      await adminClient.auth.admin.deleteUser(userId);
    }

    return new Response(
      JSON.stringify({ success: true, message: "User removed from company successfully" }),
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
