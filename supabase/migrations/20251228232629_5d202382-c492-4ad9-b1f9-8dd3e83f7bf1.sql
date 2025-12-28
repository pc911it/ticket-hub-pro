-- Add temporary password tracking for clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portal_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS temp_password_created_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Create index for portal user lookup
CREATE INDEX IF NOT EXISTS idx_clients_portal_user_id ON public.clients(portal_user_id);

-- Update RLS policy for clients to allow viewing portal fields
DROP POLICY IF EXISTS "Company members can view clients with portal info" ON public.clients;

-- Add employee role to app_role enum if not exists (it should already have staff)
-- Staff role will be used for employees with restricted access

-- Create a function to check if user is employee/staff with view-only access
CREATE OR REPLACE FUNCTION public.is_employee_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('staff', 'user')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'super_admin')
  )
$$;

-- Update client policies to allow employees to view
CREATE POLICY "Employees can view clients in their company"
ON public.clients
FOR SELECT
USING (
  is_employee_role(auth.uid()) 
  AND company_id IN (SELECT get_user_company_ids(auth.uid()))
);

-- Allow employees to create clients
CREATE POLICY "Employees can create clients"
ON public.clients
FOR INSERT
WITH CHECK (
  is_employee_role(auth.uid())
  AND company_id IN (SELECT get_user_company_ids(auth.uid()))
);

-- Update tickets policies for employees
CREATE POLICY "Employees can view tickets in their company"
ON public.tickets
FOR SELECT
USING (
  is_employee_role(auth.uid())
  AND (company_id IN (SELECT get_user_company_ids(auth.uid())) 
       OR (project_id IS NOT NULL AND is_project_partner(auth.uid(), project_id)))
);

CREATE POLICY "Employees can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (
  is_employee_role(auth.uid())
  AND company_id IN (SELECT get_user_company_ids(auth.uid()))
);

-- Update projects policies for employees
CREATE POLICY "Employees can view projects in their company"
ON public.projects
FOR SELECT
USING (
  is_employee_role(auth.uid())
  AND (company_id IN (SELECT get_user_company_ids(auth.uid()))
       OR is_project_partner(auth.uid(), id))
);

CREATE POLICY "Employees can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
  is_employee_role(auth.uid())
  AND company_id IN (SELECT get_user_company_ids(auth.uid()))
);