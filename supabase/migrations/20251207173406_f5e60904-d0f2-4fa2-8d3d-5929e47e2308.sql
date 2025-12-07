-- Create function to check if user is company owner
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = _company_id
      AND owner_id = _user_id
  )
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'super_admin'
  )
$$;

-- Update DELETE policies to only allow company owners (not staff)
-- Tickets: Only company owner can delete
DROP POLICY IF EXISTS "Company members can delete tickets" ON public.tickets;
CREATE POLICY "Company owners can delete tickets"
ON public.tickets
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Clients: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete their company clients" ON public.clients;
CREATE POLICY "Company owners can delete clients"
ON public.clients
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Inventory: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete inventory" ON public.inventory_items;
CREATE POLICY "Company owners can delete inventory"
ON public.inventory_items
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Purchase orders: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Company owners can delete purchase orders"
ON public.purchase_orders
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Suppliers: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;
CREATE POLICY "Company owners can delete suppliers"
ON public.suppliers
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Projects: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Company owners can delete projects"
ON public.projects
FOR DELETE
USING (
  is_company_owner(auth.uid(), company_id) OR is_super_admin(auth.uid())
);

-- Milestones: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete milestones" ON public.project_milestones;
CREATE POLICY "Company owners can delete milestones"
ON public.project_milestones
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_milestones.project_id 
    AND (is_company_owner(auth.uid(), p.company_id) OR is_super_admin(auth.uid()))
  )
);

-- Inventory usage: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete usage" ON public.inventory_usage;
CREATE POLICY "Company owners can delete usage"
ON public.inventory_usage
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = inventory_usage.ticket_id 
    AND (is_company_owner(auth.uid(), t.company_id) OR is_super_admin(auth.uid()))
  )
);

-- Purchase order items: Only company owner can delete
DROP POLICY IF EXISTS "Admins can delete order items" ON public.purchase_order_items;
CREATE POLICY "Company owners can delete order items"
ON public.purchase_order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.id = purchase_order_items.purchase_order_id 
    AND (is_company_owner(auth.uid(), po.company_id) OR is_super_admin(auth.uid()))
  )
);

-- Super Admin SELECT policies (can view all companies and data)
-- Companies: Super admin can view all
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
CREATE POLICY "Company members or super admin can view companies"
ON public.companies
FOR SELECT
USING (
  (id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()))
  OR (owner_id = auth.uid())
  OR is_super_admin(auth.uid())
);

-- Tickets: Super admin can view all
DROP POLICY IF EXISTS "Company members can view tickets" ON public.tickets;
CREATE POLICY "Company members or super admin can view tickets"
ON public.tickets
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
);

-- Clients: Super admin can view all
DROP POLICY IF EXISTS "Company members can view their clients" ON public.clients;
CREATE POLICY "Company members or super admin can view clients"
ON public.clients
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
);

-- Inventory: Super admin can view all
DROP POLICY IF EXISTS "Company members can view inventory" ON public.inventory_items;
CREATE POLICY "Company members or super admin can view inventory"
ON public.inventory_items
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
);

-- Purchase orders: Super admin can view all
DROP POLICY IF EXISTS "Company members can view purchase orders" ON public.purchase_orders;
CREATE POLICY "Company members or super admin can view purchase orders"
ON public.purchase_orders
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
);

-- Suppliers: Super admin can view all
DROP POLICY IF EXISTS "Company members can view suppliers" ON public.suppliers;
CREATE POLICY "Company members or super admin can view suppliers"
ON public.suppliers
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR is_super_admin(auth.uid())
);

-- Projects: Super admin can view all
DROP POLICY IF EXISTS "Company members or invited can view projects" ON public.projects;
CREATE POLICY "Company members invited or super admin can view projects"
ON public.projects
FOR SELECT
USING (
  (company_id IN (SELECT get_user_company_ids(auth.uid())))
  OR has_project_access(auth.uid(), id)
  OR is_super_admin(auth.uid())
);

-- Agents: Super admin can view all
DROP POLICY IF EXISTS "Company members can view agents" ON public.agents;
CREATE POLICY "Company members or super admin can view agents"
ON public.agents
FOR SELECT
USING (
  (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()))
  OR is_super_admin(auth.uid())
);

-- Profiles: Super admin can view all
CREATE POLICY "Super admin can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- User roles: Super admin can view all
CREATE POLICY "Super admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Company members: Super admin can view all
DROP POLICY IF EXISTS "Company members can view members of their company" ON public.company_members;
CREATE POLICY "Company members or super admin can view members"
ON public.company_members
FOR SELECT
USING (
  is_company_member(auth.uid(), company_id)
  OR is_super_admin(auth.uid())
);