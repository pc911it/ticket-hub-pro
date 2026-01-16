-- Drop existing unique index that only allows 1 super_admin
DROP INDEX IF EXISTS unique_super_admin;

-- Create a function to limit super_admin to max 2
CREATE OR REPLACE FUNCTION public.check_super_admin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check when inserting a super_admin role
  IF NEW.role = 'super_admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'super_admin') >= 2 THEN
      RAISE EXCEPTION 'Maximum of 2 super admin accounts allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to enforce limit
DROP TRIGGER IF EXISTS enforce_super_admin_limit ON public.user_roles;
CREATE TRIGGER enforce_super_admin_limit
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_super_admin_limit();

-- Update handle_new_user to never auto-assign super_admin after first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- First user gets super_admin role, all others get user role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;