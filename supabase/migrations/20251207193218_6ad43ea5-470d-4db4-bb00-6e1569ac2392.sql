-- Fix recursive RLS policy on company_members table
-- Drop the old policy that causes recursion
DROP POLICY IF EXISTS "Company members or super admin can view members" ON public.company_members;

-- Create a new policy that doesn't use is_company_member function (which queries this same table)
CREATE POLICY "Company members can view their company members"
ON public.company_members
FOR SELECT
USING (
  -- User can see their own membership records
  user_id = auth.uid()
  -- Or user is in the same company (direct check, no function call)
  OR company_id IN (
    SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
  )
  -- Or user is super admin
  OR is_super_admin(auth.uid())
);