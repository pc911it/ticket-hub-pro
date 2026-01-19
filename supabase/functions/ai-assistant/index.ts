import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIRequest {
  type: "support" | "bid" | "document" | "summary" | "chat";
  messages?: Message[];
  context?: Record<string, unknown>;
  prompt?: string;
  language?: string;
}

const systemPrompts: Record<string, string> = {
  support: `You are a helpful AI assistant for BuilderFlow, a construction project management platform. 

Your capabilities:
- Guide users through ANY feature: projects, clients, tickets, bids, invoices, permits, daily logs, inventory, equipment, contracts, and more
- Help create items: "I want to create a new project" → explain how step by step
- Explain features: "What can I do here?" → describe the current page's functionality
- Troubleshoot issues: "X isn't working" → provide solutions
- Provide best practices for construction project management
- Help with navigation: "Where do I find X?" → direct them to the right page

Platform features you know about:
• Projects - Create and manage construction projects with milestones, budgets, and team assignments
• Clients - Customer relationship management with contact info, project history, and billing
• Tickets - Support and work order tracking
• Bids & Estimates - Create detailed cost estimates and proposals
• Invoices - Bill clients and track payments
• Daily Logs - Track daily progress, weather, crew, and activities
• Permits - Manage permit applications, approvals, and inspections
• Contracts - Document management with e-signatures
• Inventory - Track materials, supplies, and stock levels
• Equipment - Manage tools and equipment assignments
• Subcontractors - Vendor and subcontractor relationships
• Calendar - Scheduling and appointments
• Change Orders - Track project scope changes
• RFIs - Request for Information management
• Submittals - Document submittals tracking

Guidelines:
- Be friendly, concise, and action-oriented
- Give step-by-step instructions when helping with tasks
- Use bullet points for clarity
- If you're unsure, say so and suggest contacting support
- Always respond in the same language the user writes in
- Pay attention to the context (current page) to give relevant help`,

  bid: `You are an expert construction estimator assistant. Your role is to help generate accurate bid estimates.
When given project details, you should:
- Break down costs into categories (labor, materials, equipment, overhead, profit margin)
- Provide line item estimates with quantities and unit prices
- Consider regional pricing variations
- Include contingency recommendations
- Format output clearly with totals

Be thorough but realistic. Always note assumptions made and suggest verification of specific local costs.
Respond with structured data when possible.`,

  document: `You are a construction document analysis expert. When analyzing documents, you should:
- Identify key information (dates, parties, amounts, scope)
- Extract permit requirements and deadlines
- Summarize contract terms and obligations
- Flag potential issues or missing information
- Organize findings in a clear, actionable format

Be precise and highlight anything that requires immediate attention.`,

  summary: `You are a project management assistant specialized in summarizing construction project updates.
When summarizing, you should:
- Highlight key progress and milestones
- Note any delays or issues
- Summarize decisions made
- List action items and next steps
- Keep summaries concise but comprehensive

Use bullet points for clarity. Prioritize information by importance.`,

  chat: `You are a helpful AI assistant for a construction project management platform.
Help users with any questions about their projects, provide insights, and assist with decision-making.
Be professional, knowledgeable, and concise.`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type = "chat", messages = [], context, prompt, language = "en" }: AIRequest = await req.json();

    const systemPrompt = systemPrompts[type] || systemPrompts.chat;
    
    // Build language instruction
    const languageInstruction = language === "es" 
      ? "\n\nIMPORTANT: You MUST respond entirely in Spanish (Español). All your responses should be in Spanish."
      : "";
    
    // Build context message if provided
    let contextMessage = "";
    if (context) {
      contextMessage = "\n\nContext information:\n" + JSON.stringify(context, null, 2);
    }

    // Build final messages array
    const finalMessages: Message[] = [
      { role: "system", content: systemPrompt + languageInstruction + contextMessage },
    ];

    if (prompt) {
      finalMessages.push({ role: "user", content: prompt });
    } else {
      finalMessages.push(...messages);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content, usage: data.usage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
