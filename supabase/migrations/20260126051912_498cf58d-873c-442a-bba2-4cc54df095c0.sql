-- Fix Super Admin Access - Include all companies for super admins
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.companies WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
  UNION
  SELECT company_id FROM public.company_members WHERE user_id = _user_id
$$;

-- Fix Table Policies
DROP POLICY IF EXISTS "Company members can view agents" ON public.agents;
CREATE POLICY "Company members can view agents" ON public.agents FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can view tickets" ON public.tickets;
CREATE POLICY "Company members can view tickets" ON public.tickets FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
CREATE POLICY "Company members can view clients" ON public.clients FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can view projects" ON public.projects;
CREATE POLICY "Company members can view projects" ON public.projects FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));