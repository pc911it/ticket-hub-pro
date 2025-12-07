-- Super admin can view all user_roles
CREATE POLICY "Super admin can manage all user roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()));