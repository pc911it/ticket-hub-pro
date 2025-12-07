-- Add approval_status column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Add approved_by and approved_at columns
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update existing companies to be approved (grandfathering)
UPDATE public.companies SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Create function for super admin to approve companies
CREATE OR REPLACE FUNCTION public.approve_company(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can approve companies';
  END IF;
  
  UPDATE public.companies 
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = _company_id;
  
  RETURN true;
END;
$$;

-- Create function for super admin to reject companies
CREATE OR REPLACE FUNCTION public.reject_company(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can reject companies';
  END IF;
  
  UPDATE public.companies 
  SET approval_status = 'rejected'
  WHERE id = _company_id;
  
  RETURN true;
END;
$$;

-- Super admin can view all companies (already in place, but ensure pending ones are visible)
-- Update company SELECT policy to let super admin see all including pending
DROP POLICY IF EXISTS "Company members or super admin can view companies" ON public.companies;
CREATE POLICY "Company members or super admin can view companies"
ON public.companies
FOR SELECT
USING (
  (id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()))
  OR (owner_id = auth.uid())
  OR is_super_admin(auth.uid())
);