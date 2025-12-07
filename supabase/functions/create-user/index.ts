import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !requestingUser) {
      console.log("Failed to get requesting user:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requesting user is a company admin (from company_members) or super_admin
    const { data: memberData, error: memberError } = await adminClient
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: superAdminData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = superAdminData?.role === "super_admin";
    const isCompanyAdmin = memberData?.role === "admin";
    const adminCompanyId = memberData?.company_id;

    if (!isSuperAdmin && !isCompanyAdmin) {
      console.log("User is not an admin of any company");
      return new Response(
        JSON.stringify({ error: "Only company admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, fullName, role, companyId } = await req.json();

    if (!email || !password || !fullName) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which company to add the user to
    const targetCompanyId = isSuperAdmin ? companyId : adminCompanyId;

    if (!targetCompanyId) {
      return new Response(
        JSON.stringify({ error: "No company specified for user creation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent creating additional admins (only one admin per company)
    if (role === "admin") {
      const { data: existingAdmins, error: adminCheckError } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", targetCompanyId)
        .eq("role", "admin");

      if (adminCheckError) {
        console.log("Error checking existing admins:", adminCheckError.message);
      }

      if (existingAdmins && existingAdmins.length > 0) {
        return new Response(
          JSON.stringify({ error: "This company already has an admin. Only one admin is permitted per company." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Admin ${requestingUser.email} creating user: ${email} with role: ${role} for company: ${targetCompanyId}`);

    // Create the user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.log("Failed to create user:", createError.message);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User created successfully: ${newUser.user.id}`);

    // Add user to the company
    const { error: memberInsertError } = await adminClient
      .from("company_members")
      .insert({
        company_id: targetCompanyId,
        user_id: newUser.user.id,
        role: role || "user",
      });

    if (memberInsertError) {
      console.log("Failed to add user to company:", memberInsertError.message);
      // User was created but company membership failed - this is a problem
      return new Response(
        JSON.stringify({ error: "User created but failed to add to company: " + memberInsertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User added to company ${targetCompanyId} with role: ${role}`);

    // Update the user_roles table if not default "user"
    if (role && role !== "user" && newUser.user) {
      const { error: updateRoleError } = await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);

      if (updateRoleError) {
        console.log("Failed to update user_roles:", updateRoleError.message);
        // Not critical - user is already in company_members
      } else {
        console.log(`user_roles updated to: ${role}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
