-- Fix infinite recursion in projects policy by simplifying it
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;

CREATE POLICY "projects_select_policy" ON public.projects FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

-- Ensure Super Admins can see ALL agents regardless of company filter in frontend
-- The RLS is working correctly - the frontend just needs to show the right company's agents

-- Fix any issues with profiles table that might cause the "company_id does not exist" error
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.company_members cm1
      JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
    )
  )
);