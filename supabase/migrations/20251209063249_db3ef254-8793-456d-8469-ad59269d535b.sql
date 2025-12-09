-- Add RLS policy to allow clients to view their own client record
CREATE POLICY "Clients can view their own record"
ON public.clients
FOR SELECT
USING (
  email = (SELECT email FROM profiles WHERE user_id = auth.uid())
);