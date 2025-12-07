-- First, create a security definer function that can check company membership without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_ids_direct(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_members
  WHERE user_id = _user_id
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Company members can view their company members" ON public.company_members;

-- Create a non-recursive policy using the security definer function
CREATE POLICY "Users can view company members"
ON public.company_members
FOR SELECT
USING (
  -- User can see their own membership
  user_id = auth.uid()
  -- Or they share a company with this member (using security definer function)
  OR company_id IN (SELECT get_user_company_ids_direct(auth.uid()))
  -- Or they're a super admin
  OR is_super_admin(auth.uid())
);