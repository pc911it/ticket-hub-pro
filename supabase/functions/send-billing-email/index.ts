import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BillingEmailRequest {
  type: 'trial_expiring' | 'trial_expired' | 'payment_success' | 'payment_failed';
  email: string;
  companyName: string;
  amount?: number;
  daysRemaining?: number;
  cardLast4?: string;
  errorMessage?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, companyName, amount, daysRemaining, cardLast4, errorMessage }: BillingEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${email} for company ${companyName}`);

    let subject = '';
    let html = '';

    switch (type) {
      case 'trial_expiring':
        subject = `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
        html = `
          <h1>Your Free Trial is Ending Soon</h1>
          <p>Hi ${companyName},</p>
          <p>Your 14-day free trial will expire in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>.</p>
          <p>To continue using all features without interruption, please ensure you have a valid payment method on file.</p>
          <p>After your trial ends, your subscription will automatically begin and your card will be charged.</p>
          <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'trial_expired':
        subject = 'Your trial has expired';
        html = `
          <h1>Your Free Trial Has Expired</h1>
          <p>Hi ${companyName},</p>
          <p>Your 14-day free trial has ended.</p>
          <p>We attempted to charge your card on file, but we need you to update your payment information to continue using the service.</p>
          <p>Please log in and update your payment method to restore access to all features.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'payment_success':
        subject = 'Payment successful - Thank you!';
        html = `
          <h1>Payment Received</h1>
          <p>Hi ${companyName},</p>
          <p>We've successfully processed your subscription payment.</p>
          <ul>
            <li><strong>Amount:</strong> $${((amount || 0) / 100).toFixed(2)}</li>
            <li><strong>Card:</strong> ****${cardLast4 || '****'}</li>
          </ul>
          <p>Thank you for your continued subscription. Your account remains active.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;

      case 'payment_failed':
        subject = 'Payment failed - Action required';
        html = `
          <h1>Payment Failed</h1>
          <p>Hi ${companyName},</p>
          <p>We were unable to process your subscription payment.</p>
          ${errorMessage ? `<p><strong>Reason:</strong> ${errorMessage}</p>` : ''}
          <p>Please log in and update your payment method to avoid service interruption.</p>
          <p>If you believe this is an error, please contact our support team.</p>
          <p>Best regards,<br>The Dispatch Team</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Dispatch <billing@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending billing email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
