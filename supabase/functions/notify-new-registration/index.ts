import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: 'new_company' | 'new_user' | 'new_client' | 'company_pending_approval' | 'trial_expiring' | 'payment_failed';
  data: {
    company_name?: string;
    company_email?: string;
    user_name?: string;
    user_email?: string;
    company_id?: string;
    additional_info?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload);

    // Get super admin email(s) to notify
    const { data: superAdmins, error: saError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (saError) {
      console.error("Error fetching super admins:", saError);
      throw saError;
    }

    const superAdminIds = superAdmins?.map(sa => sa.user_id) || [];
    
    // Get super admin emails from profiles
    const { data: adminProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .in('user_id', superAdminIds);

    if (profileError) {
      console.error("Error fetching admin profiles:", profileError);
      throw profileError;
    }

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];
    console.log("Super admin emails to notify:", adminEmails);

    if (adminEmails.length === 0) {
      console.log("No super admin emails found to notify");
      return new Response(
        JSON.stringify({ success: false, message: "No super admin emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content based on notification type
    let subject = '';
    let htmlContent = '';
    
    switch (payload.type) {
      case 'new_company':
        subject = `🏢 New Company Registration: ${payload.data.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🎉 New Company Registered!</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.company_name}</h2>
              <p style="color: #6b7280;">A new company has registered and needs your attention.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Company Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.company_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.data.company_email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Owner:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.data.user_name} (${payload.data.user_email})</td>
                </tr>
                ${payload.data.additional_info ? `
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Additional Info:</td>
                  <td style="padding: 10px;">${payload.data.additional_info}</td>
                </tr>
                ` : ''}
              </table>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                This is an automated notification from your platform.
              </p>
            </div>
          </div>
        `;
        break;

      case 'company_pending_approval':
        subject = `⏳ Company Pending Approval: ${payload.data.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">⏳ Approval Required</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.company_name}</h2>
              <p style="color: #6b7280;">A new company is waiting for your approval.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Company:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.company_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.data.company_email}</td>
                </tr>
              </table>
              <a href="${supabaseUrl.replace('.supabase.co', '')}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                Review in Dashboard
              </a>
            </div>
          </div>
        `;
        break;

      case 'new_user':
        subject = `👤 New User Registered: ${payload.data.user_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">👤 New User Registered</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.user_name}</h2>
              <p style="color: #6b7280;">A new user has created an account.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.user_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.data.user_email}</td>
                </tr>
                ${payload.data.company_name ? `
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Company:</td>
                  <td style="padding: 10px;">${payload.data.company_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          </div>
        `;
        break;

      case 'new_client':
        subject = `🤝 New Client Added: ${payload.data.user_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🤝 New Client Added</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.user_name}</h2>
              <p style="color: #6b7280;">A new client has been added to the system.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Client Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.user_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${payload.data.user_email}</td>
                </tr>
                ${payload.data.company_name ? `
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Added By Company:</td>
                  <td style="padding: 10px;">${payload.data.company_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          </div>
        `;
        break;

      case 'trial_expiring':
        subject = `⚠️ Trial Expiring Soon: ${payload.data.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">⚠️ Trial Expiring Soon</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.company_name}</h2>
              <p style="color: #6b7280;">This company's trial is about to expire. You may want to reach out.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Company:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.company_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Email:</td>
                  <td style="padding: 10px;">${payload.data.company_email}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
        break;

      case 'payment_failed':
        subject = `💳 Payment Failed: ${payload.data.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">💳 Payment Failed</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937;">${payload.data.company_name}</h2>
              <p style="color: #6b7280;">A payment has failed for this company.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Company:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.data.company_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #6b7280;">Email:</td>
                  <td style="padding: 10px;">${payload.data.company_email}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
        break;

      default:
        subject = `📢 Platform Notification`;
        htmlContent = `<p>Notification: ${JSON.stringify(payload.data)}</p>`;
    }

    // Send email via Resend
    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Platform Alerts <alerts@resend.dev>",
          to: adminEmails,
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Failed to send email:", errorText);
        throw new Error(`Email sending failed: ${errorText}`);
      }

      console.log("Email notification sent successfully to:", adminEmails);
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    // Store notification in database for in-app alerts
    const { error: insertError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        company_id: payload.data.company_id || null,
        subject: subject,
        description: `${payload.type}: ${JSON.stringify(payload.data)}`,
        priority: payload.type === 'payment_failed' ? 'high' : 'medium',
        status: 'open',
        category: 'system_notification',
      });

    if (insertError) {
      console.log("Could not store notification in support_tickets:", insertError);
      // Non-critical, continue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent",
        emails_sent_to: adminEmails 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});