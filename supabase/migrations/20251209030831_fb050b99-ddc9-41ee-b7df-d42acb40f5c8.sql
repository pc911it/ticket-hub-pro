-- Create a security definer function to check if user can insert company members
CREATE OR REPLACE FUNCTION public.can_insert_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is the company owner
    EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id AND owner_id = _user_id)
    -- Or user is a super admin
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    -- Or user is an existing admin of the company
    OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin')
$$;

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Company admins or owners can insert members" ON public.company_members;

-- Create a non-recursive INSERT policy
CREATE POLICY "Users can insert company members"
ON public.company_members
FOR INSERT
WITH CHECK (
  can_insert_company_member(auth.uid(), company_id)
);