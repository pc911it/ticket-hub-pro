-- Allow anyone to check if super_admin exists (for first-time setup check)
CREATE POLICY "Anyone can check if super_admin exists"
ON public.user_roles
FOR SELECT
USING (role = 'super_admin');