-- Create unique partial index to ensure only one super_admin can exist
CREATE UNIQUE INDEX IF NOT EXISTS unique_super_admin 
ON public.user_roles (role) 
WHERE role = 'super_admin';