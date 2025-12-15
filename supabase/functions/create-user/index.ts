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

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;

    if (existingUser) {
      console.log(`User ${email} already exists, checking if already in company...`);
      
      // Check if user is already a member of this company
      const { data: existingMember } = await adminClient
        .from("company_members")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      // Update the existing user's password if provided
      if (password) {
        const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
          existingUser.id,
          { password }
        );
        
        if (updatePasswordError) {
          console.log("Failed to update password:", updatePasswordError.message);
        } else {
          console.log(`Password updated for existing user: ${email}`);
        }
      }

      if (existingMember) {
        // User already in company - just return success since we updated their password
        console.log(`User ${email} already in company, password updated`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Password updated for existing user",
            user: { 
              id: existingUser.id, 
              email: email 
            } 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
      console.log(`Adding existing user ${email} to company ${targetCompanyId}`);
    } else {
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

      userId = newUser.user.id;
      console.log(`User created successfully: ${userId}`);
    }

    // Create or update the user's profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: userId,
        full_name: fullName,
        email: email,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.log("Failed to create/update profile:", profileError.message);
      // Continue anyway, profile is not critical
    } else {
      console.log(`Profile created/updated for user: ${userId}`);
    }

    // Add user to the company
    const { error: memberInsertError } = await adminClient
      .from("company_members")
      .insert({
        company_id: targetCompanyId,
        user_id: userId,
        role: role || "user",
      });

    if (memberInsertError) {
      console.log("Failed to add user to company:", memberInsertError.message);
      return new Response(
        JSON.stringify({ error: "Failed to add user to company: " + memberInsertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User added to company ${targetCompanyId} with role: ${role}`);

    // If role is "client", also add to clients table (only if not already exists)
    if (role === "client") {
      // Check if client already exists with this email
      const { data: existingClient } = await adminClient
        .from("clients")
        .select("id")
        .eq("email", email)
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      if (!existingClient) {
        const { error: clientError } = await adminClient
          .from("clients")
          .insert({
            company_id: targetCompanyId,
            full_name: fullName,
            email: email,
          });

        if (clientError) {
          console.log("Failed to add to clients table:", clientError.message);
          // Continue anyway, main user creation succeeded
        } else {
          console.log(`Client entry created for: ${email}`);
        }
      } else {
        console.log(`Client already exists for email: ${email}`);
      }
    }

    // Update the user_roles table if not default "user"
    if (role && role !== "user") {
      const { error: updateRoleError } = await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (updateRoleError) {
        console.log("Failed to update user_roles:", updateRoleError.message);
      } else {
        console.log(`user_roles updated to: ${role}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: email 
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
