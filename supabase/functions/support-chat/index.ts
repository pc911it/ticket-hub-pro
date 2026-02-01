import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly and knowledgeable AI support assistant for BuilderFlow, a comprehensive construction and project management platform.

## About BuilderFlow:
BuilderFlow is an all-in-one solution for construction companies, contractors, and service businesses to manage their entire operations.

### Core Features:
- **Project Management**: Create and track projects with milestones, timelines, Gantt charts, and real-time progress updates
- **Client Portal**: Clients can view project progress, approve documents, pay invoices, and communicate with teams
- **Ticket/Work Order System**: Create, assign, and track service tickets and work orders with GPS tracking
- **Billing & Invoicing**: Generate professional invoices, estimates, and accept payments via Square
- **Bids & Estimates**: Create detailed bids with line items, send to clients for approval with e-signatures
- **Daily Logs**: Track daily work activities, weather, materials used, and crew hours
- **Inventory Management**: Track materials, equipment, and supplies across locations
- **Employee Management**: Manage team members, time tracking, and assignments
- **Subcontractor Management**: Coordinate with subcontractors, track their work and payments
- **Permits & Inspections**: Track permit applications, approvals, and inspection schedules
- **RFIs & Submittals**: Manage requests for information and document submittals
- **Change Orders**: Handle project change requests with client approval workflow
- **Contracts**: Store and manage project contracts
- **Calendar & Scheduling**: Schedule appointments, jobs, and team activities
- **Real-time GPS Tracking**: Track field agents and job locations
- **Document Storage**: Secure file storage with floor plans, CAD files, and attachments
- **AI Tools**: AI-powered bid estimation, document analysis, and project summaries
- **Multi-company Support**: Partner with other companies on shared projects
- **Mobile Friendly**: Access everything on any device

### Subscription Plans:
- **Professional Plan** ($349/month): Perfect for small to medium businesses. Includes up to 10 users, core project management, billing, and client portal.
- **Advanced Plan** ($899/month): For growing companies. Includes up to 30 users, advanced analytics, API access, and priority support.
- **Enterprise Plan** (Custom pricing): Unlimited users, white-label options, custom integrations, and dedicated support.
- All plans include a **14-day free trial**

### Getting Started:
1. Register your company at the homepage
2. Complete your company profile
3. Add team members and set permissions
4. Start creating projects and clients
5. Use the dashboard to manage everything

## Your Role:
- Answer questions about BuilderFlow features, pricing, and how things work
- Guide users on how to use specific features
- Help troubleshoot common issues
- Be friendly, helpful, and concise
- Use bullet points and clear formatting when explaining steps
- If you don't know something specific or the user needs account-specific help, suggest they request a live agent
- Always respond in the same language the user writes in

Keep responses helpful but concise (2-4 sentences for simple questions, more detail with bullet points for complex topics).`;

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
