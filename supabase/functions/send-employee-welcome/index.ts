import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  employeeEmail: string;
  employeeName: string;
  companyName: string;
  temporaryPassword: string;
  portalUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      employeeEmail, 
      employeeName, 
      companyName, 
      temporaryPassword,
      portalUrl 
    }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${employeeEmail}`);

    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [employeeEmail],
      subject: `Welcome to ${companyName} - Your Employee Portal Access`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${companyName}!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hello <strong>${employeeName}</strong>,</p>
            
            <p>Your employee account has been created. You now have access to the Employee Portal where you can:</p>
            
            <ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 20px 0;">
              <li style="margin-bottom: 10px;">View and manage your assigned projects</li>
              <li style="margin-bottom: 10px;">Create and update work tickets</li>
              <li style="margin-bottom: 10px;">Track your time and work hours</li>
              <li style="margin-bottom: 10px;">Clock in/out for shifts</li>
              <li style="margin-bottom: 10px;">Submit time reports for approval</li>
            </ul>
            
            <div style="background: #fff8e6; border: 1px solid #f5c518; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #856404;">Your Login Credentials</h3>
              <p style="margin-bottom: 8px;"><strong>Email:</strong> ${employeeEmail}</p>
              <p style="margin-bottom: 8px;"><strong>Temporary Password:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${temporaryPassword}</code></p>
              <p style="font-size: 13px; color: #856404; margin-bottom: 0;">⚠️ Please change your password after your first login for security.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Access Employee Portal</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            
            <h3 style="margin-bottom: 15px;">Getting Started</h3>
            <ol style="padding-left: 20px;">
              <li style="margin-bottom: 10px;">Click the button above to access the Employee Portal</li>
              <li style="margin-bottom: 10px;">Log in with your email and temporary password</li>
              <li style="margin-bottom: 10px;">Update your password in your profile settings</li>
              <li style="margin-bottom: 10px;">Review your assigned projects and tickets</li>
              <li style="margin-bottom: 10px;">Clock in when you start your shift</li>
            </ol>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact your supervisor or admin.</p>
            
            <p style="margin-top: 30px;">Welcome aboard!<br><strong>The ${companyName} Team</strong></p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
