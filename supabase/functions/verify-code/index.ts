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
      // Use secure RPC function instead of direct table access
      const { data: result, error: verifyError } = await supabase.rpc('verify_code_internal', {
        _identifier: identifier,
        _code: code,
        _type: 'email'
      });

      if (verifyError) {
        console.error('Verification error:', verifyError);
        return new Response(
          JSON.stringify({ success: false, error: 'Verification failed' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const verificationResult = Array.isArray(result) ? result[0] : result;
      
      if (!verificationResult?.success) {
        return new Response(
          JSON.stringify({ success: false, error: verificationResult?.error_message || 'Invalid verification code' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

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
