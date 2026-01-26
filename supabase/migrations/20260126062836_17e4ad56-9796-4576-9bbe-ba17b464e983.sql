
-- ============================================================
-- COMPREHENSIVE RLS CLEANUP AND FIX
-- Removes duplicate/conflicting policies and ensures proper CRUD
-- ============================================================

-- ---------------------------------------------------------
-- STEP 1: Clean up AGENTS table policies (keep it simple)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Admins and super admins can manage agents" ON public.agents;
DROP POLICY IF EXISTS "Agents can update their own record" ON public.agents;
DROP POLICY IF EXISTS "Company members can view agents" ON public.agents;
DROP POLICY IF EXISTS "Require authentication for agents" ON public.agents;

-- Simple, clean policies for agents
CREATE POLICY "agents_select_policy" ON public.agents FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "agents_insert_policy" ON public.agents FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "agents_update_policy" ON public.agents FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "agents_delete_policy" ON public.agents FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);

-- ---------------------------------------------------------
-- STEP 2: Clean up CLIENTS table policies (too many duplicates)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Clients can update their own preferences" ON public.clients;
DROP POLICY IF EXISTS "Clients can view own record" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own verified record" ON public.clients;
DROP POLICY IF EXISTS "Company admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can insert clients for their company" ON public.clients;
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Company members or super admin can view clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can create clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can view clients in their company" ON public.clients;
DROP POLICY IF EXISTS "Only admins can view clients" ON public.clients;
DROP POLICY IF EXISTS "Require authentication for clients" ON public.clients;
DROP POLICY IF EXISTS "Staff and company admins can update their company clients" ON public.clients;

-- Clean, non-overlapping policies for clients
CREATE POLICY "clients_select_policy" ON public.clients FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    portal_user_id = auth.uid() OR
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "clients_insert_policy" ON public.clients FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "clients_update_policy" ON public.clients FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    portal_user_id = auth.uid() OR
    company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "clients_delete_policy" ON public.clients FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);

-- ---------------------------------------------------------
-- STEP 3: Clean up PROFILES table policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "View profiles with proper access control" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.company_members cm1
      JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid() 
      AND cm2.user_id = profiles.user_id
      AND cm1.is_active = true
    )
  )
);

CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- ---------------------------------------------------------
-- STEP 4: Clean up COMPANY_MEMBERS table policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Company admins can delete members" ON public.company_members;
DROP POLICY IF EXISTS "Company admins can update members" ON public.company_members;
DROP POLICY IF EXISTS "Require authentication for company_members" ON public.company_members;
DROP POLICY IF EXISTS "Users can insert company members" ON public.company_members;
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;

CREATE POLICY "company_members_select_policy" ON public.company_members FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    is_super_admin(auth.uid()) OR
    company_id IN (SELECT get_user_company_ids_direct(auth.uid()))
  )
);

CREATE POLICY "company_members_insert_policy" ON public.company_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id) OR
    -- Allow self-insert for new company registration
    user_id = auth.uid()
  )
);

CREATE POLICY "company_members_update_policy" ON public.company_members FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);

CREATE POLICY "company_members_delete_policy" ON public.company_members FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);

-- ---------------------------------------------------------
-- STEP 5: Clean up TICKETS table policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Tickets select for super admins and company members" ON public.tickets;
DROP POLICY IF EXISTS "Tickets ALL for super admins and authorized roles" ON public.tickets;

CREATE POLICY "tickets_select_policy" ON public.tickets FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "tickets_insert_policy" ON public.tickets FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "tickets_update_policy" ON public.tickets FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "tickets_delete_policy" ON public.tickets FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);

-- ---------------------------------------------------------
-- STEP 6: Clean up PROJECTS table policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can update projects" ON public.projects;

CREATE POLICY "projects_select_policy" ON public.projects FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    company_id IN (SELECT get_user_company_ids(auth.uid())) OR
    -- Also allow partner companies to see shared projects
    EXISTS (
      SELECT 1 FROM public.project_companies pc
      JOIN public.company_members cm ON pc.company_id = cm.company_id
      WHERE pc.project_id = projects.id 
      AND cm.user_id = auth.uid()
      AND pc.status = 'accepted'
    )
  )
);

CREATE POLICY "projects_insert_policy" ON public.projects FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "projects_update_policy" ON public.projects FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "projects_delete_policy" ON public.projects FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) OR
    is_company_admin(auth.uid(), company_id) OR
    is_company_owner(auth.uid(), company_id)
  )
);
