import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface ClientNotificationRequest {
  type: 'status_change' | 'work_completed' | 'work_started' | 'agent_assigned';
  ticketId: string;
  clientEmail: string;
  clientName: string;
  ticketTitle: string;
  newStatus?: string;
  previousStatus?: string;
  agentName?: string;
  notes?: string;
  companyName?: string;
}

// Verify that the request is from an internal service or authenticated user
async function verifyInternalRequest(req: Request): Promise<boolean> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  // Check for service role key header
  const providedSecret = req.headers.get("x-internal-secret");
  if (serviceRoleKey && providedSecret === serviceRoleKey) {
    return true;
  }

  // Check for valid JWT authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    
    if (token === serviceRoleKey) {
      return true;
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        // Check if user has staff/admin role
        const adminClient = createClient(supabaseUrl, serviceRoleKey!);
        const { data: membership } = await adminClient
          .from("company_members")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "staff"])
          .limit(1);
        
        if (membership && membership.length > 0) {
          return true;
        }
      }
    } catch (error) {
      console.error("Error verifying JWT:", error);
    }
  }

  return false;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isAuthorized = await verifyInternalRequest(req);
  if (!isAuthorized) {
    console.error("Unauthorized request to send-client-notification");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { 
      type, 
      ticketId, 
      clientEmail, 
      clientName, 
      ticketTitle, 
      newStatus, 
      previousStatus, 
      agentName,
      notes,
      companyName 
    }: ClientNotificationRequest = await req.json();

    // Validate required fields
    if (!type || !clientEmail || !ticketTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ${type} notification to ${clientEmail} for ticket: ${ticketTitle}`);

    let subject = '';
    let html = '';
    const firstName = clientName?.split(' ')[0] || 'Valued Customer';
    const company = companyName || 'Our Team';

    switch (type) {
      case 'status_change':
        subject = `Work Order Update: ${ticketTitle}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Work Order Status Updated</h2>
            <p>Hi ${firstName},</p>
            <p>Your work order status has been updated:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Work Order:</strong> ${ticketTitle}</p>
              ${previousStatus ? `<p style="margin: 0 0 10px 0;"><strong>Previous Status:</strong> ${getStatusLabel(previousStatus)}</p>` : ''}
              <p style="margin: 0; color: #2563eb;"><strong>New Status:</strong> ${getStatusLabel(newStatus || 'pending')}</p>
            </div>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>Log in to your portal to view more details.</p>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>${company}</p>
          </div>
        `;
        break;

      case 'work_completed':
        subject = `✅ Work Completed: ${ticketTitle}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">🎉 Work Completed!</h2>
            <p>Hi ${firstName},</p>
            <p>Great news! The work on your order has been completed:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <p style="margin: 0 0 10px 0;"><strong>Work Order:</strong> ${ticketTitle}</p>
              ${agentName ? `<p style="margin: 0 0 10px 0;"><strong>Technician:</strong> ${agentName}</p>` : ''}
              <p style="margin: 0; color: #16a34a;"><strong>Status:</strong> Completed</p>
            </div>
            ${notes ? `<p><strong>Completion Notes:</strong> ${notes}</p>` : ''}
            <p><strong>Please log in to your portal to review and approve the completed work.</strong></p>
            <p>Your approval helps us maintain quality and ensures your satisfaction with our service.</p>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>${company}</p>
          </div>
        `;
        break;

      case 'work_started':
        subject = `🔧 Work Started: ${ticketTitle}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Work Has Started</h2>
            <p>Hi ${firstName},</p>
            <p>We wanted to let you know that work has begun on your order:</p>
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
              <p style="margin: 0 0 10px 0;"><strong>Work Order:</strong> ${ticketTitle}</p>
              ${agentName ? `<p style="margin: 0;"><strong>Technician:</strong> ${agentName}</p>` : ''}
            </div>
            <p>You can track the progress in your client portal.</p>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>${company}</p>
          </div>
        `;
        break;

      case 'agent_assigned':
        subject = `Technician Assigned: ${ticketTitle}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Technician Assigned</h2>
            <p>Hi ${firstName},</p>
            <p>A technician has been assigned to your work order:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Work Order:</strong> ${ticketTitle}</p>
              <p style="margin: 0;"><strong>Technician:</strong> ${agentName || 'Assigned'}</p>
            </div>
            <p>You'll receive updates as work progresses on your order.</p>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>${company}</p>
          </div>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "Work Orders <notifications@resend.dev>",
      to: [clientEmail],
      subject,
      html,
    });

    console.log("Client notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending client notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
