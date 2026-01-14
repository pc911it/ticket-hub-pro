import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a helpful customer support assistant for TicketPro, a professional appointment scheduling and ticket management platform.

About TicketPro:
- We help businesses manage appointments, clients, and service tickets
- We offer Professional ($349/month), Advanced ($899/month), and Enterprise (custom) plans
- All plans include a 14-day free trial
- Key features: Smart scheduling, client management, real-time updates, ticket tracking, inventory management, GPS tracking
- Professional plan: Up to 10 dispatchers, 25 field agents
- Advanced plan: Up to 30 dispatchers, 100 field agents, advanced analytics, API access
- Enterprise: Unlimited everything, white-label, custom integrations

Your role:
- Answer questions about TicketPro features, pricing, and capabilities
- Help potential customers understand which plan fits their needs
- Be friendly, concise, and helpful
- If someone needs help with technical issues or account-specific questions, offer to connect them with a live agent
- If you don't know something specific, be honest and offer to connect them with a human

Keep responses brief and conversational (2-3 sentences max unless more detail is requested).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatId, visitorId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if chat exists and has an agent assigned
    if (chatId) {
      const { data: chatData } = await supabase
        .from('support_chats')
        .select('status, assigned_agent_id')
        .eq('id', chatId)
        .single();

      // If agent is handling, just save the visitor message and return
      if (chatData?.status === 'with_agent') {
        // Save visitor message
        await supabase.from('support_chat_messages').insert({
          chat_id: chatId,
          sender_type: 'visitor',
          content: message,
        });

        // Update chat timestamp
        await supabase
          .from('support_chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);

        return new Response(
          JSON.stringify({ agentHandled: true, response: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get chat history for context
    let messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    if (chatId) {
      const { data: history } = await supabase
        .from('support_chat_messages')
        .select('sender_type, content')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (history) {
        for (const msg of history) {
          if (msg.sender_type === 'visitor') {
            messages.push({ role: "user", content: msg.content });
          } else if (msg.sender_type === 'ai' || msg.sender_type === 'agent') {
            messages.push({ role: "assistant", content: msg.content });
          }
        }
      }
    }

    // Add the new message
    messages.push({ role: "user", content: message });

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "We're experiencing high demand. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Would you like to speak with a live agent?";

    // Save messages to database
    if (chatId) {
      // Save visitor message
      await supabase.from('support_chat_messages').insert({
        chat_id: chatId,
        sender_type: 'visitor',
        content: message,
      });

      // Save AI response
      await supabase.from('support_chat_messages').insert({
        chat_id: chatId,
        sender_type: 'ai',
        content: aiResponse,
      });

      // Update chat timestamp
      await supabase
        .from('support_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);
    }

    return new Response(
      JSON.stringify({ response: aiResponse, agentHandled: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
