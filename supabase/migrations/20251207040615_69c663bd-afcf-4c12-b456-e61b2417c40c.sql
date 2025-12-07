-- Drop and recreate the INSERT policy to allow all company members to create projects
DROP POLICY IF EXISTS "Staff and admins can insert projects" ON public.projects;

CREATE POLICY "Company members can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);