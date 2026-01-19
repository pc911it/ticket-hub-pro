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
}

const systemPrompts: Record<string, string> = {
  support: `You are a helpful customer support assistant for a construction project management platform called BuilderFlow. 
You help users with:
- Navigating the platform (projects, tickets, invoices, bids, etc.)
- Answering common questions about features
- Troubleshooting issues
- Providing guidance on construction project management best practices

Be friendly, professional, and concise. If you don't know something, say so and suggest contacting human support.
Always respond in the same language the user writes in.`,

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

    const { type = "chat", messages = [], context, prompt }: AIRequest = await req.json();

    const systemPrompt = systemPrompts[type] || systemPrompts.chat;
    
    // Build context message if provided
    let contextMessage = "";
    if (context) {
      contextMessage = "\n\nContext information:\n" + JSON.stringify(context, null, 2);
    }

    // Build final messages array
    const finalMessages: Message[] = [
      { role: "system", content: systemPrompt + contextMessage },
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
