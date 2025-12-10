import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-square-hmacsha256-signature',
};

interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, any>;
  };
}

// Verify Square webhook signature using HMAC-SHA256
async function verifySquareSignature(
  body: string,
  signature: string | null,
  webhookSignatureKey: string | null,
  notificationUrl: string
): Promise<boolean> {
  if (!signature || !webhookSignatureKey) {
    console.error("Missing signature or webhook signature key");
    return false;
  }

  try {
    // Square signature is computed as: Base64(HMAC-SHA256(notification_url + body, signature_key))
    const stringToSign = notificationUrl + body;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSignatureKey);
    const messageData = encoder.encode(stringToSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    return signature === computedSignature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSignatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY');
    const webhookNotificationUrl = Deno.env.get('SQUARE_WEBHOOK_NOTIFICATION_URL');

    // Read the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-square-hmacsha256-signature');

    // Verify webhook signature if configured
    if (webhookSignatureKey && webhookNotificationUrl) {
      const isValid = await verifySquareSignature(
        rawBody,
        signature,
        webhookSignatureKey,
        webhookNotificationUrl
      );

      if (!isValid) {
        console.error("Invalid Square webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log("Square webhook signature verified successfully");
    } else {
      console.warn("Square webhook signature verification is not configured - processing without verification");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from raw body
    const payload: SquareWebhookEvent = JSON.parse(rawBody);
    
    console.log('Square webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.type;
    const eventData = payload.data?.object;

    switch (eventType) {
      case 'payment.completed': {
        console.log('Payment completed event received');
        
        const payment = eventData?.payment;
        if (payment) {
          const customerId = payment.customer_id;
          const amount = payment.amount_money?.amount;
          const paymentId = payment.id;

          // Find company by Square customer ID
          const { data: company } = await supabase
            .from('companies')
            .select('id, name, email')
            .eq('square_customer_id', customerId)
            .maybeSingle();

          if (company) {
            // Update billing history
            await supabase
              .from('billing_history')
              .upsert({
                company_id: company.id,
                amount: amount,
                status: 'completed',
                square_payment_id: paymentId,
                description: 'Subscription payment via Square webhook'
              }, {
                onConflict: 'square_payment_id'
              });

            // Ensure subscription is active
            await supabase
              .from('companies')
              .update({ subscription_status: 'active' })
              .eq('id', company.id);

            // Send success email via internal call
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-billing-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'X-Internal-Secret': Deno.env.get('INTERNAL_SERVICE_SECRET') || supabaseServiceKey,
                },
                body: JSON.stringify({
                  email: company.email,
                  type: 'payment_success',
                  companyName: company.name,
                  amount: amount
                })
              });
            } catch (emailError) {
              console.error('Failed to send payment success email:', emailError);
            }

            console.log(`Payment recorded for company ${company.name}`);
          }
        }
        break;
      }

      case 'payment.failed': {
        console.log('Payment failed event received');
        
        const payment = eventData?.payment;
        if (payment) {
          const customerId = payment.customer_id;
          const amount = payment.amount_money?.amount;
          const paymentId = payment.id;

          // Find company by Square customer ID
          const { data: company } = await supabase
            .from('companies')
            .select('id, name, email')
            .eq('square_customer_id', customerId)
            .maybeSingle();

          if (company) {
            // Record failed payment
            await supabase
              .from('billing_history')
              .insert({
                company_id: company.id,
                amount: amount || 0,
                status: 'failed',
                square_payment_id: paymentId,
                description: 'Payment failed'
              });

            // Update subscription status
            await supabase
              .from('companies')
              .update({ subscription_status: 'past_due' })
              .eq('id', company.id);

            // Send failure email via internal call
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-billing-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'X-Internal-Secret': Deno.env.get('INTERNAL_SERVICE_SECRET') || supabaseServiceKey,
                },
                body: JSON.stringify({
                  email: company.email,
                  type: 'payment_failed',
                  companyName: company.name,
                  amount: (amount || 0)
                })
              });
            } catch (emailError) {
              console.error('Failed to send payment failed email:', emailError);
            }

            console.log(`Payment failure recorded for company ${company.name}`);
          }
        }
        break;
      }

      case 'customer.updated': {
        console.log('Customer updated event received');
        const customer = eventData?.customer;
        if (customer) {
          console.log(`Customer ${customer.id} updated`);
        }
        break;
      }

      case 'card.created':
      case 'card.updated': {
        console.log('Card event received:', eventType);
        const card = eventData?.card;
        if (card) {
          const customerId = card.customer_id;
          const cardId = card.id;

          // Update company's card on file
          const { error } = await supabase
            .from('companies')
            .update({ square_card_id: cardId })
            .eq('square_customer_id', customerId);

          if (!error) {
            console.log(`Card updated for customer ${customerId}`);
          }
        }
        break;
      }

      case 'card.disabled': {
        console.log('Card disabled event received');
        const card = eventData?.card;
        if (card) {
          const customerId = card.customer_id;

          // Clear the card from company
          await supabase
            .from('companies')
            .update({ square_card_id: null })
            .eq('square_customer_id', customerId);

          // Find company and notify
          const { data: company } = await supabase
            .from('companies')
            .select('id, name, email')
            .eq('square_customer_id', customerId)
            .maybeSingle();

          if (company) {
            console.log(`Card removed for company ${company.name}`);
          }
        }
        break;
      }

      case 'subscription.created':
      case 'subscription.updated': {
        console.log('Subscription event received:', eventType);
        const subscription = eventData?.subscription;
        if (subscription) {
          console.log(`Subscription ${subscription.id} status: ${subscription.status}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true, event_type: eventType }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Square webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
