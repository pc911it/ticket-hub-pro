-- COMPLETE DASHBOARD FIX
-- Fix: Realtime, Super Admin Access, Missing Data

-- PART 1: Enable Realtime for Dashboard Tables (safe to re-add)
DO $$
BEGIN
  -- These will silently succeed if already added
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS tickets';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS projects';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clients';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS agents';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- PART 2: Update Helper Function for Super Admins
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If Super Admin, return ALL company IDs
  SELECT id FROM public.companies
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  )
  UNION
  -- Standard check for everyone else
  SELECT company_id
  FROM public.company_members
  WHERE user_id = _user_id
$$;

-- PART 3: Update Table Policies to Use Helper Function

-- Fix Agents (Employees)
DROP POLICY IF EXISTS "Company members can view agents" ON public.agents;
CREATE POLICY "Company members can view agents" ON public.agents FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Fix Tickets
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can view tickets" ON public.tickets;
CREATE POLICY "Company members can view tickets" ON public.tickets FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Fix Clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
CREATE POLICY "Company members can view clients" ON public.clients FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Fix Projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can view projects" ON public.projects;
CREATE POLICY "Company members can view projects" ON public.projects FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));