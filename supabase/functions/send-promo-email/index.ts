import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromoEmailRequest {
  campaignId: string;
  promoCode: string;
  subject: string;
  body: string;
  emails: string[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { campaignId, promoCode, subject, body, emails }: PromoEmailRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error("No recipient emails provided");
    }

    console.log(`Sending promo campaign ${campaignId} to ${emails.length} recipients`);

    const results = [];

    for (const email of emails) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .promo-box { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; }
              .promo-code { font-size: 36px; font-weight: bold; letter-spacing: 4px; background: rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 8px; display: inline-block; margin: 10px 0; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              .footer { padding: 20px 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Special Offer Just for You!</h1>
              </div>
              <div class="content">
                <p>${body.replace(/\n/g, '<br>')}</p>
                <div class="promo-box">
                  <p style="margin: 0; font-size: 16px;">Use this exclusive code:</p>
                  <div class="promo-code">${promoCode}</div>
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Apply at checkout to claim your discount!</p>
                </div>
                <div style="text-align: center;">
                  <a href="https://builderflow.app/register" class="cta-button">Get Started Now →</a>
                </div>
              </div>
              <div class="footer">
                <p>This is a promotional email from BuilderFlow.</p>
                <p>If you no longer wish to receive these emails, please contact us.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "BuilderFlow <promotions@resend.dev>",
          to: [email],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error(`Failed to send to ${email}:`, errorData);
        results.push({ email, success: false, error: errorData });
      } else {
        console.log(`Email sent successfully to ${email}`);
        results.push({ email, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} emails, ${failCount} failed`,
        results,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending promo emails:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
