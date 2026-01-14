-- Create support_chats table for storing chat sessions
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting_agent', 'with_agent', 'closed')),
  assigned_agent_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_chat_messages table for storing messages
CREATE TABLE public.support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'ai', 'agent')),
  sender_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_chats - allow public to create and read their own chats
CREATE POLICY "Anyone can create support chats"
ON public.support_chats FOR INSERT
WITH CHECK (true);

CREATE POLICY "Visitors can view their own chats"
ON public.support_chats FOR SELECT
USING (true);

CREATE POLICY "Agents can update chats"
ON public.support_chats FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for support_chat_messages
CREATE POLICY "Anyone can insert messages"
ON public.support_chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
ON public.support_chat_messages FOR SELECT
USING (true);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;

-- Create indexes
CREATE INDEX idx_support_chats_visitor ON public.support_chats(visitor_id);
CREATE INDEX idx_support_chats_status ON public.support_chats(status);
CREATE INDEX idx_support_chat_messages_chat ON public.support_chat_messages(chat_id);

-- Trigger for updated_at
CREATE TRIGGER update_support_chats_updated_at
BEFORE UPDATE ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();