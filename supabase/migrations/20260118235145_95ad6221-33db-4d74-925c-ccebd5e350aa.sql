-- Fix the security definer view warning by using SECURITY INVOKER
-- This ensures RLS policies of the querying user are respected

DROP VIEW IF EXISTS public.support_chats_anonymized;

CREATE VIEW public.support_chats_anonymized 
WITH (security_invoker = true) AS
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

COMMENT ON VIEW public.support_chats_anonymized IS 'Anonymized view of support chats for analytics. Customer PII is masked. Uses SECURITY INVOKER for proper RLS.';