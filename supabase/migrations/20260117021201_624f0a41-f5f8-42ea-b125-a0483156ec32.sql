-- Fix RLS policy for support_chats INSERT - require valid session_id for anonymous visitors
DROP POLICY IF EXISTS "Authenticated users can create support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can create support chats" ON public.support_chats;
DROP POLICY IF EXISTS "Users and visitors can create support chats" ON public.support_chats;

-- Support chats require either authentication or a valid session_id
CREATE POLICY "Authenticated or session-based chat creation" 
ON public.support_chats 
FOR INSERT 
WITH CHECK (
  -- Authenticated users can create chats
  auth.uid() IS NOT NULL
  OR
  -- Anonymous visitors must provide a non-empty session_id
  (session_id IS NOT NULL AND session_id <> '' AND length(session_id) >= 10)
);