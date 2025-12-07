-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Company members can view members of their company" ON public.company_members;

-- Create a security definer function to check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Create a security definer function to check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'admin'
  )
$$;

-- Create a function to get user's company ids
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
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

-- Recreate policies using the security definer functions
CREATE POLICY "Company members can view members of their company"
ON public.company_members
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can insert members"
ON public.company_members
FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id) 
  OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = company_members.company_id)
);

CREATE POLICY "Company admins can update members"
ON public.company_members
FOR UPDATE
USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete members"
ON public.company_members
FOR DELETE
USING (is_company_admin(auth.uid(), company_id));