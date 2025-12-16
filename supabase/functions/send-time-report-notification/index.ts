import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimeReportNotificationRequest {
  agentId: string;
  agentName: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  totalTicketMinutes: number;
  totalClockMinutes: number;
}

const formatMinutes = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Time report notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      agentId,
      agentName,
      companyId,
      periodStart,
      periodEnd,
      totalTicketMinutes,
      totalClockMinutes,
    }: TimeReportNotificationRequest = await req.json();

    console.log("Processing time report notification for agent:", agentId);

    // Get company admins to notify
    const { data: companyMembers, error: membersError } = await supabase
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", companyId)
      .in("role", ["admin", "staff"]);

    if (membersError) {
      console.error("Error fetching company members:", membersError);
      throw membersError;
    }

    if (!companyMembers || companyMembers.length === 0) {
      console.log("No admins found to notify");
      return new Response(
        JSON.stringify({ message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from profiles
    const adminUserIds = companyMembers.map((m) => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const adminEmails = profiles?.filter((p) => p.email).map((p) => p.email) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending notification to admins:", adminEmails);

    // Send email notification using fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TicketPro <onboarding@resend.dev>",
        to: adminEmails,
        subject: `Time Report Submitted - ${agentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">Time Report Submitted</h2>
            <p>A new time report has been submitted and is ready for review.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Report Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${agentName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Period:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${periodStart} - ${periodEnd}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Clock Hours:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${formatMinutes(totalClockMinutes)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Ticket Time:</strong></td>
                  <td style="padding: 8px 0;">${formatMinutes(totalTicketMinutes)}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Log in to the admin dashboard to review and approve this time report.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-time-report-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
