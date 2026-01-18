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

const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

function decryptToken(encrypted: string): string {
  return atob(encrypted);
}

function encryptToken(token: string): string {
  return btoa(token);
}

async function getValidAccessToken(supabase: any, integration: any): Promise<string | null> {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  // Return existing token if valid for more than 5 minutes
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

async function pushToQuickBooks(accessToken: string, realmId: string, endpoint: string, data: any) {
  const response = await fetch(`${QB_API_BASE}/${realmId}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`QuickBooks API error for ${endpoint}:`, errorText);
    throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function findOrCreateCustomer(accessToken: string, realmId: string, client: any) {
  // First, try to find existing customer by email
  const searchQuery = encodeURIComponent(`SELECT * FROM Customer WHERE PrimaryEmailAddr = '${client.email}' MAXRESULTS 1`);
  
  const searchResponse = await fetch(`${QB_API_BASE}/${realmId}/query?query=${searchQuery}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    if (searchResult.QueryResponse?.Customer?.[0]) {
      return searchResult.QueryResponse.Customer[0];
    }
  }

  // Create new customer
  const customerData = {
    DisplayName: client.full_name,
    PrimaryEmailAddr: { Address: client.email },
    PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    BillAddr: client.address ? { Line1: client.address } : undefined,
  };

  const result = await pushToQuickBooks(accessToken, realmId, 'customer', customerData);
  return result.Customer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { company_id, action, data } = await req.json();

    console.log('QuickBooks push:', action, 'company_id:', company_id);

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

    const accessToken = await getValidAccessToken(supabase, integration);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to get valid token. Please reconnect QuickBooks.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const realmId = integration.realm_id;

    // Handle different push actions
    if (action === 'create_invoice') {
      // Get client details
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', data.client_id)
        .single();

      if (!client) {
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find or create customer in QuickBooks
      const qbCustomer = await findOrCreateCustomer(accessToken, realmId, client);

      // Build line items
      const lineItems = data.line_items?.map((item: any, index: number) => ({
        LineNum: index + 1,
        Amount: item.total || (item.quantity * item.unit_price),
        DetailType: 'SalesItemLineDetail',
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity || 1,
          UnitPrice: item.unit_price || item.total,
        },
      })) || [{
        LineNum: 1,
        Amount: data.amount,
        DetailType: 'SalesItemLineDetail',
        Description: data.description || 'Invoice',
        SalesItemLineDetail: {
          Qty: 1,
          UnitPrice: data.amount,
        },
      }];

      const invoiceData = {
        CustomerRef: { value: qbCustomer.Id },
        Line: lineItems,
        DueDate: data.due_date,
        DocNumber: data.invoice_number,
        CustomerMemo: { value: data.notes || '' },
      };

      const result = await pushToQuickBooks(accessToken, realmId, 'invoice', invoiceData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          quickbooks_invoice_id: result.Invoice?.Id,
          message: 'Invoice created in QuickBooks'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_payment') {
      // Get invoice and client details
      const { data: invoice } = await supabase
        .from('client_invoices')
        .select('*, clients(*)')
        .eq('id', data.invoice_id)
        .single();

      if (!invoice) {
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find customer in QuickBooks
      const qbCustomer = await findOrCreateCustomer(accessToken, realmId, invoice.clients);

      // Find corresponding invoice in QuickBooks (by doc number)
      const invoiceQuery = encodeURIComponent(`SELECT * FROM Invoice WHERE DocNumber = '${invoice.invoice_number}' MAXRESULTS 1`);
      const invoiceSearchResponse = await fetch(`${QB_API_BASE}/${realmId}/query?query=${invoiceQuery}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      let qbInvoiceId = null;
      if (invoiceSearchResponse.ok) {
        const invoiceResult = await invoiceSearchResponse.json();
        qbInvoiceId = invoiceResult.QueryResponse?.Invoice?.[0]?.Id;
      }

      const paymentData: any = {
        CustomerRef: { value: qbCustomer.Id },
        TotalAmt: data.amount,
        PaymentMethodRef: { value: data.payment_method === 'card' ? '1' : '2' },
      };

      // Link to invoice if found
      if (qbInvoiceId) {
        paymentData.Line = [{
          Amount: data.amount,
          LinkedTxn: [{
            TxnId: qbInvoiceId,
            TxnType: 'Invoice',
          }],
        }];
      }

      const result = await pushToQuickBooks(accessToken, realmId, 'payment', paymentData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          quickbooks_payment_id: result.Payment?.Id,
          message: 'Payment recorded in QuickBooks'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_customer') {
      const qbCustomer = await findOrCreateCustomer(accessToken, realmId, data);

      return new Response(
        JSON.stringify({ 
          success: true, 
          quickbooks_customer_id: qbCustomer.Id,
          message: 'Customer synced to QuickBooks'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_expense') {
      // Create a purchase/expense in QuickBooks
      const expenseData = {
        AccountRef: { value: data.account_id || '1' }, // Default expense account
        PaymentType: 'Cash',
        TotalAmt: data.amount,
        Line: [{
          Amount: data.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          Description: data.description,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: data.expense_account_id || '1' },
          },
        }],
        TxnDate: data.date || new Date().toISOString().split('T')[0],
      };

      const result = await pushToQuickBooks(accessToken, realmId, 'purchase', expenseData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          quickbooks_expense_id: result.Purchase?.Id,
          message: 'Expense recorded in QuickBooks'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('QuickBooks push error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
