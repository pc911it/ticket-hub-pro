
-- Fix profiles RLS: Allow super admins to insert and update profiles for any user
CREATE POLICY "Super admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
