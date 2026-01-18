import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID');
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');

// QuickBooks API base URL (sandbox vs production)
const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

function decryptToken(encrypted: string): string {
  return atob(encrypted);
}

function encryptToken(token: string): string {
  return btoa(token);
}

async function refreshTokenIfNeeded(supabase: any, integration: any): Promise<string | null> {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decryptToken(integration.access_token_encrypted);
  }

  console.log('Refreshing expired token...');
  
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
    await supabase
      .from('company_integrations')
      .update({ is_connected: false })
      .eq('id', integration.id);
    return null;
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

  await supabase
    .from('company_integrations')
    .update({
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', integration.id);

  return tokens.access_token;
}

async function fetchFromQuickBooks(accessToken: string, realmId: string, endpoint: string) {
  const response = await fetch(`${QB_API_BASE}/${realmId}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`QuickBooks API error for ${endpoint}:`, errorText);
    throw new Error(`QuickBooks API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { company_id, sync_all, data_types } = await req.json();

    console.log('QuickBooks sync for company:', company_id);

    // Get integration details
    const { data: integration, error: fetchError } = await supabase
      .from('company_integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('provider', 'quickbooks')
      .single();

    if (fetchError || !integration || !integration.is_connected) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks not connected for this company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, integration);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token. Please reconnect QuickBooks.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const realmId = integration.realm_id;
    const results: Record<string, any> = {};
    const syncTypes = data_types || (sync_all ? ['profit_loss', 'balance_sheet', 'revenue_summary', 'invoices'] : []);

    // Fetch Profit & Loss Report
    if (syncTypes.includes('profit_loss')) {
      try {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const startDate = startOfYear.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const report = await fetchFromQuickBooks(
          accessToken, 
          realmId, 
          `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`
        );

        // Cache the data
        await supabase.from('quickbooks_financial_cache').upsert({
          company_id,
          data_type: 'profit_loss',
          period_start: startDate,
          period_end: endDate,
          data: report,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'company_id,data_type' });

        results.profit_loss = { success: true };
      } catch (error: any) {
        console.error('Error fetching P&L:', error);
        results.profit_loss = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Fetch Balance Sheet
    if (syncTypes.includes('balance_sheet')) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const report = await fetchFromQuickBooks(
          accessToken, 
          realmId, 
          `reports/BalanceSheet?date=${today}`
        );

        await supabase.from('quickbooks_financial_cache').upsert({
          company_id,
          data_type: 'balance_sheet',
          period_end: today,
          data: report,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'company_id,data_type' });

        results.balance_sheet = { success: true };
      } catch (error: any) {
        console.error('Error fetching balance sheet:', error);
        results.balance_sheet = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Fetch Revenue Summary (monthly breakdown)
    if (syncTypes.includes('revenue_summary')) {
      try {
        const today = new Date();
        const months: any[] = [];
        
        // Get last 12 months of revenue data
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          const startDate = date.toISOString().split('T')[0];
          const endDate = endOfMonth.toISOString().split('T')[0];

          try {
            const report = await fetchFromQuickBooks(
              accessToken, 
              realmId, 
              `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&summarize_column_by=Total`
            );

            // Extract total income from report
            let totalIncome = 0;
            if (report.Rows?.Row) {
              const incomeRow = report.Rows.Row.find((r: any) => 
                r.group === 'Income' || r.Summary?.ColData?.[0]?.value === 'Total Income'
              );
              if (incomeRow?.Summary?.ColData?.[1]?.value) {
                totalIncome = parseFloat(incomeRow.Summary.ColData[1].value) || 0;
              }
            }

            months.push({
              month: date.toLocaleString('default', { month: 'short' }),
              year: date.getFullYear(),
              revenue: totalIncome,
            });
          } catch {
            months.push({
              month: date.toLocaleString('default', { month: 'short' }),
              year: date.getFullYear(),
              revenue: 0,
            });
          }
        }

        await supabase.from('quickbooks_financial_cache').upsert({
          company_id,
          data_type: 'revenue_summary',
          data: { months },
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'company_id,data_type' });

        results.revenue_summary = { success: true };
      } catch (error: any) {
        console.error('Error fetching revenue summary:', error);
        results.revenue_summary = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Fetch recent invoices
    if (syncTypes.includes('invoices')) {
      try {
        const invoices = await fetchFromQuickBooks(
          accessToken, 
          realmId, 
          `query?query=${encodeURIComponent("SELECT * FROM Invoice ORDER BY MetaData.CreateTime DESC MAXRESULTS 50")}`
        );

        await supabase.from('quickbooks_financial_cache').upsert({
          company_id,
          data_type: 'invoices',
          data: invoices,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'company_id,data_type' });

        results.invoices = { success: true, count: invoices.QueryResponse?.Invoice?.length || 0 };
      } catch (error: any) {
        console.error('Error fetching invoices:', error);
        results.invoices = { success: false, error: error?.message || 'Unknown error' };
      }
    }

    // Update last sync timestamp
    await supabase
      .from('company_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('QuickBooks sync error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
