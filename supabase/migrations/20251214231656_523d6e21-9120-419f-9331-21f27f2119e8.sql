-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Project admins can create invitations" ON public.project_invitations;

-- Create a new INSERT policy that checks company_members role instead of global user_roles
CREATE POLICY "Company members can create invitations for their projects" 
ON public.project_invitations 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT p.id
    FROM projects p
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

-- Also fix DELETE policy - allow project owners/admins to delete invitations
DROP POLICY IF EXISTS "Project admins can delete invitations" ON public.project_invitations;

CREATE POLICY "Project owners can delete invitations" 
ON public.project_invitations 
FOR DELETE 
USING (
  project_id IN (
    SELECT p.id
    FROM projects p
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);