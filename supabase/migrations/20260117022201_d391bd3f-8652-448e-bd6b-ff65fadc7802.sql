-- Comprehensive security hardening for support chats
-- Remove anonymous session-based access and require all access through edge functions

-- 1. Drop existing support_chats policies
DROP POLICY IF EXISTS "Secure chat creation" ON public.support_chats;
DROP POLICY IF EXISTS "Secure chat viewing" ON public.support_chats;
DROP POLICY IF EXISTS "Agents can update chats" ON public.support_chats;

-- 2. Create restrictive policies - all anonymous access goes through edge functions
-- Authenticated users can view their own chats or admins can view all
CREATE POLICY "Authenticated users can view own chats"
ON public.support_chats
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

-- Only authenticated admins can update chats
CREATE POLICY "Admins can update chats"
ON public.support_chats
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Block direct INSERT from clients - must go through edge function
CREATE POLICY "No direct chat creation"
ON public.support_chats
FOR INSERT
WITH CHECK (false);

-- 3. Drop existing support_chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.support_chat_messages;

-- 4. Create restrictive policies for messages
CREATE POLICY "Authenticated users can view messages in own chats"
ON public.support_chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.support_chats sc
    WHERE sc.id = chat_id
    AND (
      sc.visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Block direct INSERT from clients - must go through edge function
CREATE POLICY "No direct message creation"
ON public.support_chat_messages
FOR INSERT
WITH CHECK (false);

-- Admins can insert messages (for replies)
CREATE POLICY "Admins can insert messages"
ON public.support_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 5. Make client-signatures bucket private
UPDATE storage.buckets SET public = false WHERE id = 'client-signatures';