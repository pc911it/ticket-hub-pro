-- Create project_companies table to track company partnerships on projects
CREATE TABLE public.project_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  role text NOT NULL DEFAULT 'partner',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  UNIQUE(project_id, company_id)
);

-- Enable RLS
ALTER TABLE public.project_companies ENABLE ROW LEVEL SECURITY;

-- Require authentication
CREATE POLICY "Require authentication for project_companies"
ON public.project_companies
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Users can view partnerships for their company's projects or if their company is a partner
CREATE POLICY "Users can view project partnerships"
ON public.project_companies
FOR SELECT
USING (
  (project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  ))
  OR
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
);

-- Project owners (company admins/staff) can create partnerships
CREATE POLICY "Project owners can invite companies"
ON public.project_companies
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

-- Partner company admins can update (accept/decline) their invitations
CREATE POLICY "Partner admins can update their invitations"
ON public.project_companies
FOR UPDATE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

-- Project owners can delete partnerships
CREATE POLICY "Project owners can remove partnerships"
ON public.project_companies
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

-- Create function to check if user's company is a partner on a project
CREATE OR REPLACE FUNCTION public.is_project_partner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_companies pc
    WHERE pc.project_id = _project_id
      AND pc.company_id IN (SELECT get_user_company_ids(_user_id))
      AND pc.status = 'accepted'
  )
$$;

-- Update has_project_access function to include company partnerships
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is member of the project's company
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND p.company_id IN (SELECT get_user_company_ids(_user_id))
  ) OR EXISTS (
    -- User was invited to the project individually
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = _project_id
      AND (pi.invited_user_id = _user_id OR pi.invited_email = (SELECT email FROM public.profiles WHERE user_id = _user_id))
      AND pi.status = 'accepted'
  ) OR EXISTS (
    -- User's company is a partner on the project
    SELECT 1 FROM public.project_companies pc
    WHERE pc.project_id = _project_id
      AND pc.company_id IN (SELECT get_user_company_ids(_user_id))
      AND pc.status = 'accepted'
  )
$$;

-- Allow partner companies to create tickets on shared projects
DROP POLICY IF EXISTS "Company members can insert tickets" ON public.tickets;
CREATE POLICY "Company members can insert tickets"
ON public.tickets
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'staff') 
    OR EXISTS (SELECT 1 FROM company_members WHERE user_id = auth.uid())
  )
  AND (
    -- Own company project
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    -- Or partner on the project
    OR (project_id IS NOT NULL AND is_project_partner(auth.uid(), project_id))
  )
);

-- Allow partner companies to view tickets on shared projects
DROP POLICY IF EXISTS "Company members or super admin can view tickets" ON public.tickets;
CREATE POLICY "Company members or super admin can view tickets"
ON public.tickets
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
  OR (project_id IS NOT NULL AND is_project_partner(auth.uid(), project_id))
);

-- Allow partner companies to update tickets on shared projects
DROP POLICY IF EXISTS "Staff and admins can update tickets" ON public.tickets;
CREATE POLICY "Staff and admins can update tickets"
ON public.tickets
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  AND (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    OR (project_id IS NOT NULL AND is_project_partner(auth.uid(), project_id))
  )
);

-- Allow partner companies to create milestones on shared projects
DROP POLICY IF EXISTS "Company members can insert milestones" ON public.project_milestones;
CREATE POLICY "Company members can insert milestones"
ON public.project_milestones
FOR INSERT
WITH CHECK (
  has_project_access(auth.uid(), project_id)
);

-- Allow partner companies to update milestones on shared projects  
DROP POLICY IF EXISTS "Staff and admins can update milestones" ON public.project_milestones;
CREATE POLICY "Staff and admins can update milestones"
ON public.project_milestones
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  AND has_project_access(auth.uid(), project_id)
);

-- Enable realtime for project_companies
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_companies;