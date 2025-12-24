import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimateEmailRequest {
  estimateId: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-estimate function");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { estimateId }: EstimateEmailRequest = await req.json();
    console.log("Sending estimate:", estimateId);

    if (!estimateId) {
      throw new Error("Estimate ID is required");
    }

    // Fetch estimate with client and company info
    const { data: estimate, error: estimateError } = await supabase
      .from("estimates")
      .select(`
        *,
        clients (full_name, email, address, phone),
        companies (name, email, phone, address, city, state, logo_url)
      `)
      .eq("id", estimateId)
      .single();

    if (estimateError || !estimate) {
      console.error("Error fetching estimate:", estimateError);
      throw new Error("Estimate not found");
    }

    const client = estimate.clients;
    const company = estimate.companies;

    if (!client?.email) {
      throw new Error("Client email not found");
    }

    // Parse line items
    const lineItems = Array.isArray(estimate.line_items) ? estimate.line_items : [];
    const lineItemsHtml = lineItems.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description || ''}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantity || 1}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${(item.rate || 0).toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${(item.amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const amount = (estimate.amount / 100).toFixed(2);
    const validUntil = estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : 'N/A';

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
            <h1 style="margin: 0; color: #111827; font-size: 24px;">${company?.name || 'Company'}</h1>
            <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">${company?.email || ''}</p>
          </div>

          <!-- Estimate Info -->
          <div style="padding: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div>
                <h2 style="margin: 0 0 5px; color: #111827; font-size: 28px; font-weight: bold;">ESTIMATE</h2>
                <p style="margin: 0; color: #6b7280;">${estimate.estimate_number}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; color: #6b7280;">Valid Until: ${validUntil}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <p style="margin: 0 0 5px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Prepared For</p>
              <p style="margin: 0; color: #111827; font-weight: 600;">${client.full_name}</p>
              <p style="margin: 0; color: #6b7280;">${client.email}</p>
            </div>

            ${estimate.description ? `
              <div style="margin-bottom: 30px; padding: 15px; background: #f9fafb; border-radius: 6px;">
                <p style="margin: 0; color: #374151;">${estimate.description}</p>
              </div>
            ` : ''}

            <!-- Line Items -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Description</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Rate</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>

            <!-- Total -->
            <div style="text-align: right; padding-top: 15px; border-top: 2px solid #111827;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">
                Total: $${amount}
              </p>
            </div>

            ${estimate.notes ? `
              <div style="margin-top: 30px; padding: 15px; background: #fefce8; border-radius: 6px; border-left: 4px solid #eab308;">
                <p style="margin: 0 0 5px; font-weight: 600; color: #854d0e;">Notes & Terms</p>
                <p style="margin: 0; color: #713f12; white-space: pre-wrap;">${estimate.notes}</p>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="padding: 20px 30px; background: #f9fafb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This estimate is valid until ${validUntil}. Please contact us if you have any questions.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${company?.name || 'Billing'} <onboarding@resend.dev>`,
      to: [client.email],
      subject: `Estimate ${estimate.estimate_number} from ${company?.name || 'Company'}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update estimate status to sent
    const { error: updateError } = await supabase
      .from("estimates")
      .update({ 
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("id", estimateId);

    if (updateError) {
      console.error("Error updating estimate status:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-estimate function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
