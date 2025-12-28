import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientPortalRequest {
  clientId: string;
  sendEmail?: boolean;
}

// Generate a random temporary password
function generateTempPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Send email using Resend API directly
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.log("No RESEND_API_KEY configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portal Access <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return false;
    }

    console.log("Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !callingUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { clientId, sendEmail: shouldSendEmail = true }: CreateClientPortalRequest = await req.json();
    console.log("Creating portal for client:", clientId, "sendEmail:", shouldSendEmail);

    // Get the client
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, full_name, email, company_id, portal_user_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!client.email) {
      return new Response(JSON.stringify({ error: "Client does not have an email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get company name for emails
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", client.company_id)
      .single();
    const companyName = company?.name || "Company";

    // Check if client already has a portal account
    if (client.portal_user_id) {
      // Reset their password instead
      const tempPassword = generateTempPassword();
      
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        client.portal_user_id,
        { password: tempPassword }
      );

      if (updateAuthError) {
        console.error("Error resetting password:", updateAuthError);
        return new Response(JSON.stringify({ error: updateAuthError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Update client record
      await supabaseAdmin
        .from("clients")
        .update({
          temp_password_created_at: new Date().toISOString(),
          must_change_password: true,
        })
        .eq("id", clientId);

      // Send email if requested
      if (shouldSendEmail) {
        await sendEmail(
          client.email,
          `Your ${companyName} Portal Password Has Been Reset`,
          `
            <h1>Hello ${client.full_name}!</h1>
            <p>Your portal password has been reset.</p>
            <p><strong>Your temporary password is:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            <p>Please log in and change your password immediately for security.</p>
            <p>Best regards,<br>${companyName}</p>
          `
        );
      }

      console.log("Password reset for existing client portal user");
      return new Response(JSON.stringify({ 
        success: true, 
        tempPassword,
        message: "Password reset successfully",
        existingUser: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create new auth user for the client
    const tempPassword = generateTempPassword();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: client.full_name,
        is_client_portal: true,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Add client role to user_roles
    await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "client",
      });

    // Update client record with portal user ID
    await supabaseAdmin
      .from("clients")
      .update({
        portal_user_id: newUser.user.id,
        temp_password_created_at: new Date().toISOString(),
        must_change_password: true,
      })
      .eq("id", clientId);

    // Send welcome email if requested
    if (shouldSendEmail) {
      await sendEmail(
        client.email,
        `Welcome to the ${companyName} Client Portal`,
        `
          <h1>Welcome to the Client Portal, ${client.full_name}!</h1>
          <p>Your portal account has been created.</p>
          <p><strong>Email:</strong> ${client.email}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
          <p>Please log in and change your password immediately for security.</p>
          <p>Best regards,<br>${companyName}</p>
        `
      );
    }

    console.log("Portal created successfully for client:", clientId);
    return new Response(JSON.stringify({ 
      success: true, 
      tempPassword,
      message: "Portal account created successfully",
      existingUser: false
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-client-portal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
