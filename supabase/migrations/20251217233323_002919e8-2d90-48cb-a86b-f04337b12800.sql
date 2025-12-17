-- Create support tickets table for Super Admin to handle company support
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support ticket messages for conversation thread
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_staff_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Require authentication for support_tickets"
ON public.support_tickets FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can view all support tickets"
ON public.support_tickets FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage all support tickets"
ON public.support_tickets FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Company members can view their own tickets"
ON public.support_tickets FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company members can create support tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (
  (company_id IN (SELECT get_user_company_ids(auth.uid())) AND user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets FOR UPDATE
USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- RLS policies for support_ticket_messages
CREATE POLICY "Require authentication for support_ticket_messages"
ON public.support_ticket_messages FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view messages for accessible tickets"
ON public.support_ticket_messages FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Users can add messages to accessible tickets"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  (ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ) AND user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

-- Add updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();