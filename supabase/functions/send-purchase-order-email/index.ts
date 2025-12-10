import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface PurchaseOrderEmailRequest {
  to: string;
  supplierName: string;
  orderNumber: string;
  companyName: string;
  companyId?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitCost: number;
  }>;
  totalCost: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

// Verify that the request is from an authenticated company admin/owner
async function verifyCompanyAdmin(req: Request, companyId?: string): Promise<boolean> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const internalSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");
  
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
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey!);
        
        // Check if user is a super admin
        const { data: roles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roles?.role === "super_admin") {
          return true;
        }
        
        // Check if user is a company admin/owner
        const memberQuery = adminClient
          .from("company_members")
          .select("role, company_id")
          .eq("user_id", user.id)
          .in("role", ["admin"]);
        
        // If companyId is provided, verify user belongs to that company
        if (companyId) {
          memberQuery.eq("company_id", companyId);
        }
        
        const { data: membership } = await memberQuery.limit(1);
        
        if (membership && membership.length > 0) {
          return true;
        }
        
        // Also check if user is a company owner
        const ownerQuery = adminClient
          .from("companies")
          .select("id")
          .eq("owner_id", user.id);
        
        if (companyId) {
          ownerQuery.eq("id", companyId);
        }
        
        const { data: ownedCompanies } = await ownerQuery.limit(1);
        
        if (ownedCompanies && ownedCompanies.length > 0) {
          return true;
        }
      }
    } catch (error) {
      console.error("Error verifying JWT:", error);
    }
  }

  return false;
}

// Validate email address format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PurchaseOrderEmailRequest = await req.json();
    const {
      to,
      supplierName,
      orderNumber,
      companyName,
      companyId,
      items,
      totalCost,
      expectedDeliveryDate,
      notes,
    } = body;

    // Verify the request is authorized
    const isAuthorized = await verifyCompanyAdmin(req, companyId);
    if (!isAuthorized) {
      console.error("Unauthorized request to send-purchase-order-email");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate required fields
    if (!to || !supplierName || !orderNumber || !companyName || !items) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!isValidEmail(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending purchase order email to: ${to}`);
    console.log(`Order number: ${orderNumber}`);

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitCost.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.unitCost).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Purchase Order</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${orderNumber}</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Dear ${supplierName || 'Supplier'},</p>
            
            <p>We would like to place the following order from <strong>${companyName}</strong>:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f9fafb;">
                  <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">$${totalCost.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            ${expectedDeliveryDate ? `
              <p><strong>Expected Delivery:</strong> ${expectedDeliveryDate}</p>
            ` : ''}
            
            ${notes ? `
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Notes:</strong>
                <p style="margin: 8px 0 0 0;">${notes}</p>
              </div>
            ` : ''}
            
            <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              This is an automated purchase order notification. Please reply to confirm.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Purchase Orders <onboarding@resend.dev>",
        to: [to],
        subject: `Purchase Order ${orderNumber} from ${companyName}`,
        html: emailHtml,
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
    console.error("Error sending purchase order email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
