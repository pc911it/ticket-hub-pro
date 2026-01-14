import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook (x-www-form-urlencoded)
    const formData = await req.formData();
    const from = formData.get("From") as string; // e.g., +15551234567 or whatsapp:+15551234567
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !body) {
      console.error("Missing required fields:", { from, body });
      return new Response("Missing required fields", { status: 400 });
    }

    // Determine channel type
    const isWhatsApp = from.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const phoneNumber = isWhatsApp ? from.replace("whatsapp:", "") : from;

    console.log(`Received ${channel} message from ${phoneNumber}: ${body}`);

    // Find or create chat session for this phone number
    let { data: existingChat } = await supabase
      .from("support_chats")
      .select("*")
      .eq("visitor_phone", phoneNumber)
      .in("status", ["active", "waiting_agent", "with_agent"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let chatId: string;

    if (existingChat) {
      chatId = existingChat.id;
      // Update the chat to reflect new message
      await supabase
        .from("support_chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId);
    } else {
      // Create new chat session
      const { data: newChat, error: createError } = await supabase
        .from("support_chats")
        .insert({
          visitor_id: `${channel}_${phoneNumber}`,
          visitor_phone: phoneNumber,
          channel: channel,
          status: "waiting_agent", // SMS/WhatsApp go directly to agent queue
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating chat:", createError);
        throw createError;
      }

      chatId = newChat.id;

      // Send welcome message back
      await sendTwilioMessage(
        phoneNumber,
        channel,
        "Thanks for contacting TicketPro support! A team member will respond shortly."
      );
    }

    // Save the incoming message
    const { error: messageError } = await supabase
      .from("support_chat_messages")
      .insert({
        chat_id: chatId,
        sender_type: "visitor",
        content: body,
        channel: channel,
      });

    if (messageError) {
      console.error("Error saving message:", messageError);
      throw messageError;
    }

    // Return TwiML response (empty to acknowledge receipt)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/xml",
        },
      }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/xml",
        },
      }
    );
  }
});

async function sendTwilioMessage(to: string, channel: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const fromNumber = channel === "whatsapp" 
    ? Deno.env.get("TWILIO_WHATSAPP_NUMBER")!
    : Deno.env.get("TWILIO_PHONE_NUMBER")!;

  const toNumber = channel === "whatsapp" ? `whatsapp:${to}` : to;
  const fromFormatted = channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromFormatted,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Twilio send error:", errorText);
    throw new Error(`Failed to send Twilio message: ${errorText}`);
  }

  return response.json();
}
