-- Drop the problematic policy that references auth.users directly
DROP POLICY IF EXISTS "Restricted support chat viewing" ON public.support_chats;

-- Create a simpler policy that doesn't reference auth.users
CREATE POLICY "Super admins and support admins can view support chats"
ON public.support_chats
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Also fix support_chat_messages if it has similar issues
DROP POLICY IF EXISTS "Restricted support chat message viewing" ON public.support_chat_messages;

CREATE POLICY "Support staff can view chat messages"
ON public.support_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_chats sc
    WHERE sc.id = chat_id
    AND (is_super_admin(auth.uid()) OR is_support_admin(auth.uid()))
  )
);