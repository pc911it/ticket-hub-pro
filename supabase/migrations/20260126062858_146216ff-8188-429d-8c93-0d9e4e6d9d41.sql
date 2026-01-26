
-- Clean up remaining duplicate policies on projects and tickets tables

-- PROJECTS: Remove old duplicates (keep only the new clean ones)
DROP POLICY IF EXISTS "Require authentication for projects" ON public.projects;
DROP POLICY IF EXISTS "Company admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Employees can create projects" ON public.projects;
DROP POLICY IF EXISTS "Company members can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Employees can view projects in their company" ON public.projects;
DROP POLICY IF EXISTS "Clients can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Company members invited or super admin can view projects" ON public.projects;
DROP POLICY IF EXISTS "Staff admins and owners can update projects" ON public.projects;

-- TICKETS: Remove old duplicates (keep only the new clean ones)
DROP POLICY IF EXISTS "Require authentication for tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company admins can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Employees can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Company members or super admin can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Employees can view tickets in their company" ON public.tickets;
DROP POLICY IF EXISTS "Clients can approve their completed tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff admins and owners can update tickets" ON public.tickets;
