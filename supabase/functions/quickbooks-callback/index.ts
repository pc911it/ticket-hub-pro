import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const realmId = url.searchParams.get('realmId');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('QuickBooks callback received:', { code: !!code, realmId, state: !!state, error });

    // Handle OAuth errors
    if (error) {
      return new Response(
        generateHTML('error', `QuickBooks connection failed: ${error}`),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state || !realmId) {
      return new Response(
        generateHTML('error', 'Missing required parameters'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state to get company_id
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        generateHTML('error', 'Invalid state parameter'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { company_id } = stateData;

    if (!company_id) {
      return new Response(
        generateHTML('error', 'Missing company ID'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens using the auth function
    const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/quickbooks-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: 'exchange_code',
        company_id,
        code,
        realm_id: realmId,
      }),
    });

    const authResult = await authResponse.json();

    if (!authResponse.ok || authResult.error) {
      return new Response(
        generateHTML('error', authResult.error || 'Failed to complete connection'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Success! Close popup and notify parent window
    return new Response(
      generateHTML('success', 'QuickBooks connected successfully!'),
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return new Response(
      generateHTML('error', 'An unexpected error occurred'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});

function generateHTML(status: 'success' | 'error', message: string): string {
  const isSuccess = status === 'success';
  const bgColor = isSuccess ? '#10B981' : '#EF4444';
  const icon = isSuccess ? '✓' : '✗';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>QuickBooks Connection</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${bgColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 20px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 24px;
    }
    p {
      margin: 0 0 20px;
      opacity: 0.8;
    }
    .close-text {
      font-size: 14px;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${isSuccess ? 'Connected!' : 'Connection Failed'}</h1>
    <p>${message}</p>
    <p class="close-text">This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'quickbooks_${status}',
        message: '${message}'
      }, '*');
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>
  `;
}
