import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get companies with trials expiring in 3 days, 1 day, or today
    const now = new Date();
    const threeDays = new Date(now);
    threeDays.setDate(threeDays.getDate() + 3);
    const oneDay = new Date(now);
    oneDay.setDate(oneDay.getDate() + 1);

    const { data: expiringTrials, error } = await supabase
      .from('companies')
      .select('id, name, email, trial_ends_at')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', now.toISOString())
      .lte('trial_ends_at', threeDays.toISOString());

    if (error) {
      console.error('Failed to fetch expiring trials:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch companies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiringTrials?.length || 0} companies with expiring trials`);

    const results = [];

    for (const company of expiringTrials || []) {
      const trialEnds = new Date(company.trial_ends_at);
      const diffTime = trialEnds.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Only send emails at 3 days, 1 day, or 0 days remaining
      if (daysRemaining === 3 || daysRemaining === 1 || daysRemaining === 0) {
        console.log(`Sending trial expiring email to ${company.email} (${daysRemaining} days remaining)`);

        try {
          const emailResponse = await supabase.functions.invoke('send-billing-email', {
            body: {
              type: 'trial_expiring',
              email: company.email,
              companyName: company.name,
              daysRemaining,
            },
          });

          results.push({
            companyId: company.id,
            daysRemaining,
            emailSent: !emailResponse.error,
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to send email to ${company.email}:`, err);
          results.push({
            companyId: company.id,
            daysRemaining,
            emailSent: false,
            error: errorMessage,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check trial expiry error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
