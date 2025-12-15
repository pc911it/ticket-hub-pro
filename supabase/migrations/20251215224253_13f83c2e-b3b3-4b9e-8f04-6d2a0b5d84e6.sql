-- Drop the existing update policy for clients
DROP POLICY IF EXISTS "Staff can update their company clients" ON public.clients;

-- Create new update policy that checks both user_roles AND company_members
CREATE POLICY "Staff and company admins can update their company clients" 
ON public.clients 
FOR UPDATE 
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_company_admin(auth.uid(), company_id)
    OR is_company_owner(auth.uid(), company_id)
  )
);