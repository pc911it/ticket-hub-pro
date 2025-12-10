import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface ApprovalEmailRequest {
  company_id: string;
  status: "approved" | "rejected";
}

// Verify that the request is from an internal service or authenticated super admin
async function verifyInternalRequest(req: Request): Promise<boolean> {
  const internalSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  // Check for internal service secret header
  const providedSecret = req.headers.get("x-internal-secret");
  if (internalSecret && providedSecret === internalSecret) {
    return true;
  }
  
  // Check if called with service role key
  if (serviceRoleKey && providedSecret === serviceRoleKey) {
    return true;
  }

  // Check for valid JWT authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    
    // If it's the service role key, allow
    if (token === serviceRoleKey) {
      return true;
    }
    
    // Verify JWT and check if user is super admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        // Check if user is a super admin
        const adminClient = createClient(supabaseUrl, serviceRoleKey!);
        const { data: roles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roles?.role === "super_admin") {
          return true;
        }
      }
    } catch (error) {
      console.error("Error verifying JWT:", error);
    }
  }

  return false;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify the request is authorized
  const isAuthorized = await verifyInternalRequest(req);
  if (!isAuthorized) {
    console.error("Unauthorized request to send-approval-email");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, status }: ApprovalEmailRequest = await req.json();

    // Validate inputs
    if (!company_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id and status" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (status !== "approved" && status !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be 'approved' or 'rejected'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate company_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(company_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid company_id format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing approval email for company ${company_id} with status ${status}`);

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, email, owner_id")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      console.error("Error fetching company:", companyError);
      throw new Error("Company not found");
    }

    // Get owner email from profiles
    let ownerEmail = company.email;
    if (company.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", company.owner_id)
        .single();
      
      if (profile?.email) {
        ownerEmail = profile.email;
      }
    }

    console.log(`Sending ${status} email to ${ownerEmail} for company ${company.name}`);

    let subject: string;
    let htmlContent: string;

    if (status === "approved") {
      subject = `🎉 Your company "${company.name}" has been approved!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">Your company has been approved!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Great news! <strong>${company.name}</strong> has been reviewed and approved by our team.
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              You now have full access to all features of the platform. Log in to get started!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${supabaseUrl.replace('.supabase.co', '')}/auth" 
                 style="background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Log In Now
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Welcome to the team!<br>
              <strong>The TicketPro Team</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `Update on your company registration - "${company.name}"`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Registration Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">We've reviewed your application</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for your interest in joining our platform. After careful review, we were unable to approve the registration for <strong>${company.name}</strong> at this time.
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              If you believe this was a mistake or would like more information, please contact our support team.
            </p>
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Need help?</strong> Reply to this email or contact our support team for assistance.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Best regards,<br>
              <strong>The TicketPro Team</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TicketPro <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-approval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
