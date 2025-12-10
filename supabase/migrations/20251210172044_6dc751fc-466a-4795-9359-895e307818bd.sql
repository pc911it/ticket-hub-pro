-- Add RESTRICTIVE policies to require authentication on all sensitive tables
-- This prevents anonymous access even when other permissive policies exist

-- profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- agents table
CREATE POLICY "Require authentication for agents"
ON public.agents
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- clients table
CREATE POLICY "Require authentication for clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- companies table
CREATE POLICY "Require authentication for companies"
ON public.companies
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- suppliers table
CREATE POLICY "Require authentication for suppliers"
ON public.suppliers
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- billing_history table
CREATE POLICY "Require authentication for billing_history"
ON public.billing_history
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- tickets table
CREATE POLICY "Require authentication for tickets"
ON public.tickets
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- projects table
CREATE POLICY "Require authentication for projects"
ON public.projects
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- inventory_items table
CREATE POLICY "Require authentication for inventory_items"
ON public.inventory_items
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- inventory_usage table
CREATE POLICY "Require authentication for inventory_usage"
ON public.inventory_usage
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- notifications table
CREATE POLICY "Require authentication for notifications"
ON public.notifications
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- job_updates table
CREATE POLICY "Require authentication for job_updates"
ON public.job_updates
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- company_members table
CREATE POLICY "Require authentication for company_members"
ON public.company_members
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- purchase_orders table
CREATE POLICY "Require authentication for purchase_orders"
ON public.purchase_orders
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- purchase_order_items table
CREATE POLICY "Require authentication for purchase_order_items"
ON public.purchase_order_items
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_milestones table
CREATE POLICY "Require authentication for project_milestones"
ON public.project_milestones
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_attachments table
CREATE POLICY "Require authentication for project_attachments"
ON public.project_attachments
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_agents table
CREATE POLICY "Require authentication for project_agents"
ON public.project_agents
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- project_invitations table
CREATE POLICY "Require authentication for project_invitations"
ON public.project_invitations
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- ticket_attachments table
CREATE POLICY "Require authentication for ticket_attachments"
ON public.ticket_attachments
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);