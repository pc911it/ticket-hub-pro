-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view project agents" ON public.project_agents;
DROP POLICY IF EXISTS "Authenticated users can view project attachments" ON public.project_attachments;
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.ticket_attachments;

-- Create project_invitations table for cross-company collaboration
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_user_id UUID,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, invited_email)
);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check if user has access to a project (member of company OR invited)
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
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
    -- User was invited to the project
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = _project_id
      AND (pi.invited_user_id = _user_id OR pi.invited_email = (SELECT email FROM public.profiles WHERE user_id = _user_id))
      AND pi.status = 'accepted'
  )
$$;

-- Projects: Company members OR invited users can view
CREATE POLICY "Company members or invited can view projects"
ON public.projects FOR SELECT
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR has_project_access(auth.uid(), id)
);

-- Tickets: Company members can view their company's tickets
CREATE POLICY "Company members can view tickets"
ON public.tickets FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Clients: Company members can view (need to add company_id to clients)
-- For now, keep authenticated access since clients don't have company_id yet
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Project agents: Can view if has project access
CREATE POLICY "Users with project access can view project agents"
ON public.project_agents FOR SELECT
USING (has_project_access(auth.uid(), project_id));

-- Project attachments: Can view if has project access
CREATE POLICY "Users with project access can view project attachments"
ON public.project_attachments FOR SELECT
USING (has_project_access(auth.uid(), project_id));

-- Project milestones: Can view if has project access
CREATE POLICY "Users with project access can view milestones"
ON public.project_milestones FOR SELECT
USING (has_project_access(auth.uid(), project_id));

-- Ticket attachments: Company members can view
CREATE POLICY "Company members can view ticket attachments"
ON public.ticket_attachments FOR SELECT
USING (
  ticket_id IN (
    SELECT t.id FROM public.tickets t
    WHERE t.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

-- Project invitations policies
CREATE POLICY "Users can view invitations for their projects"
ON public.project_invitations FOR SELECT
USING (
  has_project_access(auth.uid(), project_id)
  OR invited_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Project admins can create invitations"
ON public.project_invitations FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Invited users can update their invitation"
ON public.project_invitations FOR UPDATE
USING (
  invited_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  OR invited_user_id = auth.uid()
);