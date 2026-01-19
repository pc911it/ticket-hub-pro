import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email?: string;
  phone?: string;
  type: 'email' | 'phone';
}

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, type }: VerificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (type === 'email' && email) {
      // Use secure RPC function to store verification code
      const { data: codeId, error: insertError } = await supabase.rpc('create_verification_code', {
        _identifier: email.toLowerCase(),
        _type: 'email',
        _code: code,
        _expires_at: expiresAt.toISOString()
      });

      if (insertError) {
        console.error('Error storing verification code:', insertError);
        throw new Error('Failed to generate verification code');
      }
      
      console.log('Verification code created with ID:', codeId);

      // Send email via Resend API
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Verification <onboarding@resend.dev>",
          to: [email],
          subject: "Your Verification Code",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #f0f9ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                  .footer { margin-top: 30px; font-size: 12px; color: #666; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h2>Email Verification</h2>
                  <p>Use the following code to verify your email address:</p>
                  <div class="code">${code}</div>
                  <p>This code will expire in 10 minutes.</p>
                  <p>If you didn't request this code, please ignore this email.</p>
                  <div class="footer">
                    <p>This is an automated message, please do not reply.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Email send error:", errorData);
        throw new Error("Failed to send verification email");
      }

      console.log("Email sent successfully");

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent to your email' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else if (type === 'phone' && phone) {
      // For phone verification, we'll use Supabase's built-in phone auth
      // This requires Twilio to be configured in the Supabase dashboard
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        console.error('Phone OTP error:', error);
        throw new Error(error.message || 'Failed to send phone verification');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent to your phone' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      throw new Error('Invalid verification type or missing contact information');
    }
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
