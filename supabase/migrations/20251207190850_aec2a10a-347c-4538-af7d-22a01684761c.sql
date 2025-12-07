-- Drop the existing broken INSERT policy
DROP POLICY IF EXISTS "Company admins can insert members" ON public.company_members;

-- Create a fixed policy that allows:
-- 1. Company admins to add members
-- 2. Company owners to add members
-- 3. Users adding themselves as the first member of a new company they own
CREATE POLICY "Company admins or owners can insert members"
ON public.company_members
FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR is_company_owner(auth.uid(), company_id)
  OR (
    -- Allow user to add themselves as admin to a company they own that has no members yet
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
    )
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_members.company_id
      AND c.owner_id = auth.uid()
    )
  )
);