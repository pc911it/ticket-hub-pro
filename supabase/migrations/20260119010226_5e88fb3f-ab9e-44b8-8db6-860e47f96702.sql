-- Create table for company support live chats
CREATE TABLE public.company_support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  assigned_admin UUID,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for chat messages
CREATE TABLE public.company_support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.company_support_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('company_user', 'super_admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_support_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_support_chats
-- Company members can view their company's chats
CREATE POLICY "Company members can view their chats"
ON public.company_support_chats
FOR SELECT
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

-- Company members can create chats for their company
CREATE POLICY "Company members can create chats"
ON public.company_support_chats
FOR INSERT
WITH CHECK (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  AND initiated_by = auth.uid()
);

-- Super admins can update any chat (to assign themselves, close, etc.)
CREATE POLICY "Super admins can update chats"
ON public.company_support_chats
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Company members can update their own chats (to close them)
CREATE POLICY "Company members can update their chats"
ON public.company_support_chats
FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- RLS policies for chat messages
-- Users can view messages for chats they have access to
CREATE POLICY "Users can view chat messages"
ON public.company_support_chat_messages
FOR SELECT
USING (
  chat_id IN (
    SELECT id FROM public.company_support_chats
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
  OR is_super_admin(auth.uid())
);

-- Users can insert messages to chats they have access to
CREATE POLICY "Company users can send messages"
ON public.company_support_chat_messages
FOR INSERT
WITH CHECK (
  (
    chat_id IN (
      SELECT id FROM public.company_support_chats
      WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
    AND sender_type = 'company_user'
    AND sender_id = auth.uid()
  )
  OR (
    is_super_admin(auth.uid())
    AND sender_type = 'super_admin'
    AND sender_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_company_support_chats_company_id ON public.company_support_chats(company_id);
CREATE INDEX idx_company_support_chats_status ON public.company_support_chats(status);
CREATE INDEX idx_company_support_chat_messages_chat_id ON public.company_support_chat_messages(chat_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_support_chat_messages;

-- Add trigger for updated_at
CREATE TRIGGER update_company_support_chats_updated_at
BEFORE UPDATE ON public.company_support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();