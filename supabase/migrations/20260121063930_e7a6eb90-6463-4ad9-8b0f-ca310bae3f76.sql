-- =============================================
-- SECURITY HARDENING: Leads Table
-- Remove permissive policies allowing all members to access leads
-- Only admins should access sensitive lead contact data
-- =============================================

-- Drop the overly permissive policies that allow all company members
DROP POLICY IF EXISTS "Users can view leads for their company" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads for their company" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads for their company" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads for their company" ON public.leads;

-- Add restrictive base policy requiring authentication
CREATE POLICY "Require authentication for leads"
ON public.leads
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Ensure only the admin policies remain (already exist but re-confirm they're correct)
-- The existing policies "Only admins can view/insert/update/delete leads" are already correct