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
    const { chatId, message, senderId } = await req.json();

    if (!chatId || !message) {
      return new Response(
        JSON.stringify({ error: "chatId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get chat details to determine channel
    const { data: chat, error: chatError } = await supabase
      .from("support_chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      console.error("Chat not found:", chatError);
      return new Response(
        JSON.stringify({ error: "Chat not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save message to database
    const { error: messageError } = await supabase
      .from("support_chat_messages")
      .insert({
        chat_id: chatId,
        sender_type: "agent",
        sender_id: senderId,
        content: message,
        channel: chat.channel,
      });

    if (messageError) {
      console.error("Error saving message:", messageError);
      throw messageError;
    }

    // If SMS or WhatsApp, send via Twilio
    if ((chat.channel === "sms" || chat.channel === "whatsapp") && chat.visitor_phone) {
      const twilioResult = await sendTwilioMessage(
        chat.visitor_phone,
        chat.channel,
        message
      );
      console.log("Twilio message sent:", twilioResult);
    }

    // Update chat timestamp
    await supabase
      .from("support_chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send reply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendTwilioMessage(to: string, channel: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = channel === "whatsapp" 
    ? Deno.env.get("TWILIO_WHATSAPP_NUMBER")
    : Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    throw new Error("Twilio credentials not configured");
  }

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
