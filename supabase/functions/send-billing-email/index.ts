import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface BillingEmailRequest {
  type: 'trial_expiring' | 'trial_expired' | 'payment_success' | 'payment_failed';
  email: string;
  companyName: string;
  amount?: number;
  daysRemaining?: number;
  cardLast4?: string;
  errorMessage?: string;
}

// Verify that the request is from an internal service or authenticated user
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
    
    // Verify JWT using Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        // Check if user is a super admin or has appropriate permissions
        const adminClient = createClient(supabaseUrl, serviceRoleKey!);
        const { data: roles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roles?.role === "super_admin") {
          return true;
        }
        
        // Check if user is a company admin/owner
        const { data: membership } = await adminClient
          .from("company_members")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin"])
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify the request is authorized
  const isAuthorized = await verifyInternalRequest(req);
  if (!isAuthorized) {
    console.error("Unauthorized request to send-billing-email");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { type, email, companyName, amount, daysRemaining, cardLast4, errorMessage }: BillingEmailRequest = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate required fields
    if (!type || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and companyName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ${type} email to ${email} for company ${companyName}`);

    let subject = '';
    let html = '';

    switch (type) {
      case 'trial_expiring':
        subject = `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
        html = `
          <h1>Your Free Trial is Ending Soon</h1>
          <p>Hi ${companyName},</p>
          <p>Your 14-day free trial will expire in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>.</p>
          <p>To continue using all features without interruption, please ensure you have a valid payment method on file.</p>
          <p>After your trial ends, your subscription will automatically begin and your card will be charged.</p>
          <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'trial_expired':
        subject = 'Your trial has expired';
        html = `
          <h1>Your Free Trial Has Expired</h1>
          <p>Hi ${companyName},</p>
          <p>Your 14-day free trial has ended.</p>
          <p>We attempted to charge your card on file, but we need you to update your payment information to continue using the service.</p>
          <p>Please log in and update your payment method to restore access to all features.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'payment_success':
        subject = 'Payment successful - Thank you!';
        html = `
          <h1>Payment Received</h1>
          <p>Hi ${companyName},</p>
          <p>We've successfully processed your subscription payment.</p>
          <ul>
            <li><strong>Amount:</strong> $${((amount || 0) / 100).toFixed(2)}</li>
            <li><strong>Card:</strong> ****${cardLast4 || '****'}</li>
          </ul>
          <p>Thank you for your continued subscription. Your account remains active.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'payment_failed':
        subject = 'Payment failed - Action required';
        html = `
          <h1>Payment Failed</h1>
          <p>Hi ${companyName},</p>
          <p>We were unable to process your subscription payment.</p>
          ${errorMessage ? `<p><strong>Reason:</strong> ${errorMessage}</p>` : ''}
          <p>Please log in and update your payment method to avoid service interruption.</p>
          <p>If you believe this is an error, please contact our support team.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: "Invalid email type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await resend.emails.send({
      from: "Dispatch <billing@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending billing email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
