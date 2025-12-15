import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailRequest {
  invoiceId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invoiceId }: InvoiceEmailRequest = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Missing invoiceId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch invoice with client and company details
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: invoice, error: invoiceError } = await adminClient
      .from("client_invoices")
      .select(`
        *,
        clients(full_name, email, address, phone),
        companies:company_id(name, email, phone, address, city, state, logo_url)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clientEmail = invoice.clients?.email;
    const clientName = invoice.clients?.full_name || "Valued Customer";
    const companyName = invoice.companies?.name || "Our Company";
    const companyEmail = invoice.companies?.email || "";

    if (!clientEmail) {
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedAmount = `$${(invoice.amount / 100).toFixed(2)}`;
    const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log(`Sending invoice ${invoice.invoice_number} to ${clientEmail}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoice_number}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Invoice</h1>
          <p style="color: #d4a574; margin: 5px 0 0; font-size: 14px;">${companyName}</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;">Dear ${clientName},</p>
          
          <p>Please find below the details of your invoice:</p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 20px; color: #1e3a5f;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${dueDate}</td>
              </tr>
            </table>
          </div>
          
          ${invoice.description ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #1e3a5f; margin-bottom: 10px; font-size: 16px;">Description</h3>
              <p style="margin: 0; color: #4b5563;">${invoice.description}</p>
            </div>
          ` : ''}
          
          ${invoice.notes ? `
            <div style="margin: 20px 0; padding: 15px; background: #fffbeb; border-left: 4px solid #d4a574; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Notes:</strong> ${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              If you have any questions about this invoice, please contact us at 
              <a href="mailto:${companyEmail}" style="color: #1e3a5f;">${companyEmail}</a>
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            ${companyName}${invoice.companies?.address ? ` • ${invoice.companies.address}` : ''}${invoice.companies?.city ? `, ${invoice.companies.city}` : ''}${invoice.companies?.state ? `, ${invoice.companies.state}` : ''}
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `${companyName} <billing@resend.dev>`,
      to: [clientEmail],
      subject: `Invoice ${invoice.invoice_number} - ${formattedAmount} due ${dueDate}`,
      html,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    // Update invoice status to sent
    await adminClient
      .from("client_invoices")
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      })
      .eq("id", invoiceId);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
