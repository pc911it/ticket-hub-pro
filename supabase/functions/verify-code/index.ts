import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  identifier: string; // email or phone
  code: string;
  type: 'email' | 'phone';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, code, type }: VerifyRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'email') {
      // Check the verification code in the database
      const { data: verificationRecord, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('identifier', identifier.toLowerCase())
        .eq('type', 'email')
        .eq('code', code)
        .eq('verified', false)
        .single();

      if (fetchError || !verificationRecord) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired verification code' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if code is expired
      if (new Date(verificationRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Verification code has expired' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark as verified
      await supabase
        .from('verification_codes')
        .update({ verified: true })
        .eq('id', verificationRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Email verified successfully' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else if (type === 'phone') {
      // For phone, use Supabase's built-in verification
      const { error } = await supabase.auth.verifyOtp({
        phone: identifier,
        token: code,
        type: 'sms',
      });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message || 'Invalid verification code' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Phone verified successfully' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      throw new Error('Invalid verification type');
    }
  } catch (error: any) {
    console.error("Error in verify-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
