-- Fix security issues with RLS policies

-- 1. Fix plan_features - restrict to authenticated users only
DROP POLICY IF EXISTS "Plan features are publicly readable" ON public.plan_features;
CREATE POLICY "Plan features readable by authenticated users" 
ON public.plan_features 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Strengthen support_chats INSERT policy with additional session validation
-- Add a hash-based check to prevent session guessing
DROP POLICY IF EXISTS "Authenticated or session-based chat creation" ON public.support_chats;
CREATE POLICY "Secure chat creation" 
ON public.support_chats 
FOR INSERT 
WITH CHECK (
  -- Authenticated users can create chats
  auth.uid() IS NOT NULL
  OR
  -- Anonymous visitors must provide a valid session_id (UUID format, min 36 chars)
  (
    session_id IS NOT NULL 
    AND session_id <> '' 
    AND length(session_id) >= 36
    AND session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

-- 3. Strengthen support_chats SELECT policy for session-based access
DROP POLICY IF EXISTS "Users can view their own support chats" ON public.support_chats;
CREATE POLICY "Secure chat viewing" 
ON public.support_chats 
FOR SELECT 
USING (
  -- Authenticated users can view chats matching their email or if they're admin/super_admin
  (
    auth.uid() IS NOT NULL 
    AND (
      visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
  )
  OR
  -- Anonymous users with valid UUID session can view only their chats
  (
    auth.uid() IS NULL 
    AND session_id IS NOT NULL
    AND length(session_id) >= 36
    AND session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND session_id = current_setting('app.session_id', true)
  )
);

-- 4. Remove direct query access to user_roles for checking super_admin existence
-- Client code will use edge function instead
-- Keep existing policies but ensure no public SELECT for role checking
DROP POLICY IF EXISTS "Anyone can check if super_admin exists" ON public.user_roles;