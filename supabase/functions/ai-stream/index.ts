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

interface StreamRequest {
  type: "support" | "bid" | "document" | "summary" | "chat";
  messages: Message[];
  context?: Record<string, unknown>;
}

const systemPrompts: Record<string, string> = {
  support: `You are a helpful customer support assistant for a construction project management platform called BuilderFlow. 
You help users with navigating the platform, answering questions, and troubleshooting.
Be friendly, professional, and concise. Always respond in the same language the user writes in.`,

  bid: `You are an expert construction estimator. Help generate accurate bid estimates with itemized costs.
Break down by categories: labor, materials, equipment, overhead, profit. Be thorough but realistic.`,

  document: `You are a construction document analyst. Extract and summarize key information from documents.
Identify dates, parties, amounts, requirements. Flag issues and organize findings clearly.`,

  summary: `You are a project update summarizer. Create concise summaries highlighting progress, issues, and action items.
Use bullet points. Prioritize by importance.`,

  chat: `You are a helpful AI assistant for construction project management.
Help with questions, provide insights, and assist with decision-making. Be professional and concise.`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type = "chat", messages, context }: StreamRequest = await req.json();

    const systemPrompt = systemPrompts[type] || systemPrompts.chat;
    let contextMessage = "";
    if (context) {
      contextMessage = "\n\nContext:\n" + JSON.stringify(context, null, 2);
    }

    const finalMessages: Message[] = [
      { role: "system", content: systemPrompt + contextMessage },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
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
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI stream error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
