-- HARDEN SUPPORT CHAT CREATION: Add database-level rate limiting

-- Create a function to check rate limits for support chat creation
CREATE OR REPLACE FUNCTION public.check_support_chat_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_chat_count INTEGER;
  rate_limit_window INTERVAL := '1 hour';
  max_chats_per_window INTEGER := 5;
BEGIN
  -- Count recent chats from the same visitor (by email or visitor_id)
  SELECT COUNT(*) INTO recent_chat_count
  FROM public.support_chats
  WHERE (
    (NEW.visitor_email IS NOT NULL AND visitor_email = NEW.visitor_email)
    OR (NEW.visitor_id IS NOT NULL AND visitor_id = NEW.visitor_id)
  )
  AND created_at > NOW() - rate_limit_window;
  
  -- Block if rate limit exceeded
  IF recent_chat_count >= max_chats_per_window THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum % support chats per hour', max_chats_per_window;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce rate limiting on support chat creation
DROP TRIGGER IF EXISTS enforce_support_chat_rate_limit ON public.support_chats;
CREATE TRIGGER enforce_support_chat_rate_limit
  BEFORE INSERT ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.check_support_chat_rate_limit();

-- Update the INSERT policy to require valid visitor identification
DROP POLICY IF EXISTS "Authenticated users can create support chats" ON public.support_chats;
DROP POLICY IF EXISTS "No direct chat creation" ON public.support_chats;

-- Allow chat creation only with valid visitor info (email or visitor_id required)
CREATE POLICY "Support chats require visitor identification"
ON public.support_chats
FOR INSERT
TO public
WITH CHECK (
  -- Must have either visitor_email or visitor_id
  (visitor_email IS NOT NULL AND visitor_email != '')
  OR (visitor_id IS NOT NULL AND visitor_id != '')
);

COMMENT ON FUNCTION public.check_support_chat_rate_limit() IS 'Rate limiting trigger for support chat creation. Limits to 5 chats per hour per visitor.';