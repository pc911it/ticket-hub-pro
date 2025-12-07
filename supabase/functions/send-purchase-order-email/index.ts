import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseOrderEmailRequest {
  to: string;
  supplierName: string;
  orderNumber: string;
  companyName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitCost: number;
  }>;
  totalCost: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      supplierName,
      orderNumber,
      companyName,
      items,
      totalCost,
      expectedDeliveryDate,
      notes,
    }: PurchaseOrderEmailRequest = await req.json();

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

    console.log("Email sent successfully:", emailResponse);

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
