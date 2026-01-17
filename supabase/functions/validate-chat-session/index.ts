import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting map - in production, use Redis or database
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    
    // Rate limit by IP
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait.", valid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const { session_id, action } = await req.json();

    if (!session_id || typeof session_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "Session ID required", valid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate session_id format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session_id)) {
      console.warn(`Invalid session_id format from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Invalid session format", valid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "create") {
      // Parse additional fields from request body
      const body = await req.clone().json();
      const { visitor_name, visitor_email, visitor_phone, topic, department, order_reference } = body;
      
      // Create a new chat session with the validated session_id
      const { data: chat, error } = await adminClient
        .from("support_chats")
        .insert({
          session_id,
          visitor_id: session_id,
          visitor_name: visitor_name || null,
          visitor_email: visitor_email || null,
          visitor_phone: visitor_phone || null,
          topic: topic || 'general',
          department: department || 'general',
          order_reference: order_reference || null,
          status: "waiting",
          channel: "web",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating chat:", error);
        throw error;
      }

      console.log(`Chat created with session_id: ${session_id} from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ valid: true, chat_id: chat.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "validate") {
      // Validate that a chat exists for this session
      const { data: chat, error } = await adminClient
        .from("support_chats")
        .select("id, status, created_at")
        .eq("session_id", session_id)
        .maybeSingle();

      if (error) {
        console.error("Error validating session:", error);
        throw error;
      }

      if (!chat) {
        return new Response(
          JSON.stringify({ valid: false, error: "Session not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Check if session is too old (24 hours max)
      const createdAt = new Date(chat.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        console.warn(`Expired session_id: ${session_id} from IP: ${clientIP}`);
        return new Response(
          JSON.stringify({ valid: false, error: "Session expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 410 }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, chat_id: chat.id, status: chat.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "get_messages") {
      // Get messages for a validated session
      const { data: chat } = await adminClient
        .from("support_chats")
        .select("id")
        .eq("session_id", session_id)
        .maybeSingle();

      if (!chat) {
        return new Response(
          JSON.stringify({ valid: false, messages: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      const { data: messages, error } = await adminClient
        .from("support_chat_messages")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ valid: true, messages: messages || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "send_message") {
      const body = await req.clone().json();
      const { message } = body;
      
      if (!message || typeof message !== 'string' || message.length > 5000) {
        return new Response(
          JSON.stringify({ error: "Invalid message", valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data: chat } = await adminClient
        .from("support_chats")
        .select("id")
        .eq("session_id", session_id)
        .maybeSingle();

      if (!chat) {
        return new Response(
          JSON.stringify({ valid: false, error: "Chat not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      const { data: newMessage, error } = await adminClient
        .from("support_chat_messages")
        .insert({
          chat_id: chat.id,
          content: message,
          sender_type: "visitor",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ valid: true, message: newMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action", valid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("Error in validate-chat-session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", valid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
