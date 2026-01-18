-- Harden support_chats security: Remove admin access, restrict to support_admin and super_admin only
-- Also create a masked view for non-sensitive operations

-- Drop the overly permissive policies that include 'admin' role
DROP POLICY IF EXISTS "Authenticated users can view own chats" ON public.support_chats;
DROP POLICY IF EXISTS "Admins can update chats" ON public.support_chats;
DROP POLICY IF EXISTS "Authenticated users can view messages in own chats" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_chat_messages;

-- Create restrictive SELECT policy for support_chats
-- Only super_admin, support_admin can view all chats
-- Visitors can only see their own chats (by matching email)
CREATE POLICY "Restricted support chat viewing"
ON public.support_chats
FOR SELECT
TO authenticated
USING (
  -- Super admins and support admins can view all
  is_super_admin(auth.uid()) 
  OR is_support_admin(auth.uid())
  -- Visitors can only see their own chats
  OR (visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);

-- Only support staff can update chats
CREATE POLICY "Support staff can update chats"
ON public.support_chats
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Create restrictive SELECT policy for support_chat_messages
CREATE POLICY "Restricted message viewing"
ON public.support_chat_messages
FOR SELECT
TO authenticated
USING (
  -- Support staff can view all messages
  is_super_admin(auth.uid()) 
  OR is_support_admin(auth.uid())
  -- Visitors can only see messages in their own chats
  OR EXISTS (
    SELECT 1 FROM support_chats sc
    WHERE sc.id = support_chat_messages.chat_id
    AND sc.visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- Only support staff can insert messages (replies)
CREATE POLICY "Support staff can insert messages"
ON public.support_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) OR is_support_admin(auth.uid())
);

-- Create a secure view that masks visitor contact info for analytics/reporting
-- This can be used by other roles if needed without exposing PII
CREATE OR REPLACE VIEW public.support_chats_anonymized AS
SELECT 
  id,
  status,
  assigned_agent_id,
  created_at,
  updated_at,
  -- Mask email to show only domain for analytics
  CASE 
    WHEN visitor_email IS NOT NULL THEN 
      'visitor@' || SPLIT_PART(visitor_email, '@', 2)
    ELSE NULL 
  END as visitor_email_domain,
  -- Completely hide phone numbers
  CASE 
    WHEN visitor_phone IS NOT NULL THEN '***-***-****'
    ELSE NULL 
  END as visitor_phone_masked,
  -- Keep visitor name but truncate for privacy
  CASE 
    WHEN visitor_name IS NOT NULL THEN 
      LEFT(visitor_name, 1) || '***'
    ELSE 'Anonymous'
  END as visitor_name_masked,
  channel,
  topic,
  department
FROM public.support_chats;

-- Grant select on the anonymized view to authenticated users
GRANT SELECT ON public.support_chats_anonymized TO authenticated;

-- Add comment explaining the security model
COMMENT ON TABLE public.support_chats IS 'Support chat sessions. Access restricted to super_admin and support_admin roles only. Regular admins cannot access customer contact information.';
COMMENT ON VIEW public.support_chats_anonymized IS 'Anonymized view of support chats for analytics. Customer PII is masked.';