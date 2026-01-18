-- Create a function to check if user is a support admin
CREATE OR REPLACE FUNCTION public.is_support_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'support_admin'
  )
$$;

-- Update RLS policies for support_chats to allow support_admin access
DROP POLICY IF EXISTS "Super admins can view all support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Super admins and support admins can view all support chats" ON public.support_chats;
CREATE POLICY "Super admins and support admins can view all support chats"
ON public.support_chats
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

DROP POLICY IF EXISTS "Super admins can manage all support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Super admins and support admins can manage all support chats" ON public.support_chats;
CREATE POLICY "Super admins and support admins can manage all support chats"
ON public.support_chats
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Update RLS policies for support_chat_messages to allow support_admin access
DROP POLICY IF EXISTS "Super admins can view all support chat messages" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Super admins and support admins can view all support chat messages" ON public.support_chat_messages;
CREATE POLICY "Super admins and support admins can view all support chat messages"
ON public.support_chat_messages
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

DROP POLICY IF EXISTS "Super admins can manage support chat messages" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Super admins and support admins can manage support chat messages" ON public.support_chat_messages;
CREATE POLICY "Super admins and support admins can manage support chat messages"
ON public.support_chat_messages
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Update support_tickets policies
DROP POLICY IF EXISTS "Super admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Super admins and support admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Super admins and support admins can view all tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

DROP POLICY IF EXISTS "Super admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Super admins and support admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Super admins and support admins can manage all tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Update support_ticket_messages policies
DROP POLICY IF EXISTS "Super admins can view all ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Super admins and support admins can view all ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Super admins and support admins can view all ticket messages"
ON public.support_ticket_messages
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

DROP POLICY IF EXISTS "Super admins can manage ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Super admins and support admins can manage ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Super admins and support admins can manage ticket messages"
ON public.support_ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);