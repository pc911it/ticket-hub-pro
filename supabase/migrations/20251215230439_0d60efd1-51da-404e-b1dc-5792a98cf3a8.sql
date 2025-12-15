-- Drop existing project update policy
DROP POLICY IF EXISTS "Staff and admins can update projects" ON projects;

-- Create new policy that also allows company owners and admins
CREATE POLICY "Staff admins and owners can update projects"
ON projects
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR is_company_admin(auth.uid(), company_id)
  OR is_company_owner(auth.uid(), company_id)
  OR is_super_admin(auth.uid())
);

-- Drop existing ticket update policy  
DROP POLICY IF EXISTS "Staff and admins can update tickets" ON tickets;

-- Create new policy that also allows company owners and admins
CREATE POLICY "Staff admins and owners can update tickets"
ON tickets
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'staff'::app_role)
    OR is_company_admin(auth.uid(), company_id)
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  ) 
  AND (
    (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR ((project_id IS NOT NULL) AND is_project_partner(auth.uid(), project_id))
  )
);