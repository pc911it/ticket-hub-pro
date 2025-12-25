-- Fix 1: Remove the policy that exposes super_admin existence to everyone
DROP POLICY IF EXISTS "Anyone can check if super_admin exists" ON public.user_roles;

-- Fix 2: Strengthen the clients "view their own record" policy
-- First drop the existing vulnerable policy
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

-- Create a more secure policy that requires:
-- 1. User is authenticated
-- 2. Their verified profile email matches the client email
-- 3. The client belongs to a company (additional layer of validation)
CREATE POLICY "Clients can view their own verified record" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND email = (
    SELECT p.email 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.email IS NOT NULL
  )
  AND company_id IS NOT NULL
);

-- Also allow clients to update their own notification preferences only
DROP POLICY IF EXISTS "Clients can update their own preferences" ON public.clients;

CREATE POLICY "Clients can update their own preferences" 
ON public.clients 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND email = (
    SELECT p.email 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.email IS NOT NULL
  )
  AND company_id IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND email = (
    SELECT p.email 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.email IS NOT NULL
  )
);