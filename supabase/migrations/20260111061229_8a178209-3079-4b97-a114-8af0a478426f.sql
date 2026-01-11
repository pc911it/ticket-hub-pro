-- Drop the existing admin policy that doesn't work for company admins
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that allows company admins to view profiles of users in their company
CREATE POLICY "Company admins can view company member profiles"
ON public.profiles
FOR SELECT
USING (
  -- Super admin can see all
  is_super_admin(auth.uid())
  -- Or user can see their own profile
  OR auth.uid() = user_id
  -- Or user is a company admin and the profile belongs to someone in their company
  OR EXISTS (
    SELECT 1 FROM public.company_members cm1
    WHERE cm1.user_id = auth.uid()
      AND cm1.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM public.company_members cm2
        WHERE cm2.user_id = profiles.user_id
          AND cm2.company_id = cm1.company_id
      )
  )
);

-- Drop the now redundant policies since the new one covers all cases
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;