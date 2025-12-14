-- Create table for chat message read receipts
CREATE TABLE public.chat_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Require authentication
CREATE POLICY "Require authentication for chat_read_receipts"
ON public.chat_read_receipts FOR ALL
USING (auth.uid() IS NOT NULL);

-- Users with project access can view read receipts
CREATE POLICY "Users can view read receipts for accessible comments"
ON public.chat_read_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_comments pc
    WHERE pc.id = comment_id AND has_project_access(auth.uid(), pc.project_id)
  )
);

-- Users can insert their own read receipts
CREATE POLICY "Users can mark messages as read"
ON public.chat_read_receipts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_receipts;