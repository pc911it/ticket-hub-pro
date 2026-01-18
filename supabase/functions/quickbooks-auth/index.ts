import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID');
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// QuickBooks OAuth endpoints
const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

// Simple encryption for tokens (in production, use proper encryption)
function encryptToken(token: string): string {
  return btoa(token);
}

function decryptToken(encrypted: string): string {
  return atob(encrypted);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { action, company_id, code, realm_id, state } = await req.json();
    
    console.log('QuickBooks auth action:', action, 'company_id:', company_id);

    if (action === 'get_auth_url') {
      // Generate OAuth URL for QuickBooks
      if (!QUICKBOOKS_CLIENT_ID) {
        return new Response(
          JSON.stringify({ 
            error: 'QuickBooks integration not configured. Please add QUICKBOOKS_CLIENT_ID secret.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/quickbooks-callback`;
      const scope = 'com.intuit.quickbooks.accounting openid profile email';
      const stateParam = btoa(JSON.stringify({ company_id }));

      const authUrl = `${QB_AUTH_URL}?` + new URLSearchParams({
        client_id: QUICKBOOKS_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        state: stateParam,
      }).toString();

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange_code') {
      // Exchange authorization code for tokens
      if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
        return new Response(
          JSON.stringify({ error: 'QuickBooks credentials not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/quickbooks-callback`;
      const credentials = btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`);

      const tokenResponse = await fetch(QB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      
      // Calculate token expiry
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

      // Store tokens in database
      const { error: upsertError } = await supabase
        .from('company_integrations')
        .upsert({
          company_id: company_id,
          provider: 'quickbooks',
          is_connected: true,
          access_token_encrypted: encryptToken(tokens.access_token),
          refresh_token_encrypted: encryptToken(tokens.refresh_token),
          realm_id: realm_id,
          token_expires_at: expiresAt.toISOString(),
          sync_settings: {
            auto_sync: false,
            sync_invoices: true,
            sync_payments: true,
            sync_customers: true,
          },
        }, {
          onConflict: 'company_id,provider',
        });

      if (upsertError) {
        console.error('Error storing tokens:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh_token') {
      // Refresh expired access token
      const { data: integration, error: fetchError } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', company_id)
        .eq('provider', 'quickbooks')
        .single();

      if (fetchError || !integration) {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshToken = decryptToken(integration.refresh_token_encrypted);
      const credentials = btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`);

      const tokenResponse = await fetch(QB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        console.error('Token refresh failed');
        // Mark as disconnected
        await supabase
          .from('company_integrations')
          .update({ is_connected: false })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

      await supabase
        .from('company_integrations')
        .update({
          access_token_encrypted: encryptToken(tokens.access_token),
          refresh_token_encrypted: encryptToken(tokens.refresh_token),
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', integration.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('QuickBooks auth error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
