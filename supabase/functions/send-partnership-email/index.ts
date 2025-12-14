import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartnershipEmailRequest {
  type: "invitation" | "accepted" | "declined";
  project_id: string;
  partner_company_id: string;
  inviting_company_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { type, project_id, partner_company_id, inviting_company_id }: PartnershipEmailRequest = await req.json();

    // Validate inputs
    if (!type || !project_id || !partner_company_id || !inviting_company_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing partnership email: ${type} for project ${project_id}`);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Get inviting company details
    const { data: invitingCompany } = await supabase
      .from("companies")
      .select("name, email, owner_id")
      .eq("id", inviting_company_id)
      .single();

    // Get partner company details
    const { data: partnerCompany } = await supabase
      .from("companies")
      .select("name, email, owner_id")
      .eq("id", partner_company_id)
      .single();

    if (!invitingCompany || !partnerCompany) {
      throw new Error("Company not found");
    }

    // Determine recipient based on email type
    let recipientEmail: string;
    let subject: string;
    let htmlContent: string;

    if (type === "invitation") {
      // Send to partner company owner
      if (partnerCompany.owner_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", partnerCompany.owner_id)
          .single();
        recipientEmail = profile?.email || partnerCompany.email;
      } else {
        recipientEmail = partnerCompany.email;
      }

      subject = `🤝 Partnership Invitation: "${project.name}"`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🤝 Partnership Invitation</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">You've been invited to collaborate!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              <strong>${invitingCompany.name}</strong> has invited <strong>${partnerCompany.name}</strong> to collaborate on the project:
            </p>
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1d4ed8; margin: 0; font-size: 20px;">${project.name}</h3>
            </div>
            <p style="color: #4b5563; font-size: 16px;">
              As a partner, you'll have full access to view and contribute to this project, including:
            </p>
            <ul style="color: #4b5563; font-size: 15px;">
              <li>Create and manage tickets</li>
              <li>Update project milestones</li>
              <li>Communicate via project chat</li>
              <li>View all project details and attachments</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 14px;">
                Log in to your dashboard to accept or decline this invitation.
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
    } else {
      // Send to inviting company owner for accept/decline
      if (invitingCompany.owner_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", invitingCompany.owner_id)
          .single();
        recipientEmail = profile?.email || invitingCompany.email;
      } else {
        recipientEmail = invitingCompany.email;
      }

      if (type === "accepted") {
        subject = `✅ Partnership Accepted: "${project.name}"`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Partnership Accepted!</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin-top: 0;">Great news!</h2>
              <p style="color: #4b5563; font-size: 16px;">
                <strong>${partnerCompany.name}</strong> has accepted your partnership invitation for the project:
              </p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #10b981; margin: 0; font-size: 20px;">${project.name}</h3>
              </div>
              <p style="color: #4b5563; font-size: 16px;">
                They now have full collaboration access to this project. You can start working together immediately!
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                Best regards,<br>
                <strong>The TicketPro Team</strong>
              </p>
            </div>
          </body>
          </html>
        `;
      } else {
        subject = `Partnership Declined: "${project.name}"`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Partnership Update</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #111827; margin-top: 0;">Partnership Declined</h2>
              <p style="color: #4b5563; font-size: 16px;">
                <strong>${partnerCompany.name}</strong> has declined your partnership invitation for the project:
              </p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #6b7280; margin: 0; font-size: 20px;">${project.name}</h3>
              </div>
              <p style="color: #4b5563; font-size: 16px;">
                You can always invite other companies to collaborate on this project.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                Best regards,<br>
                <strong>The TicketPro Team</strong>
              </p>
            </div>
          </body>
          </html>
        `;
      }
    }

    console.log(`Sending ${type} email to ${recipientEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TicketPro <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Partnership email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-partnership-email function:", error);
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