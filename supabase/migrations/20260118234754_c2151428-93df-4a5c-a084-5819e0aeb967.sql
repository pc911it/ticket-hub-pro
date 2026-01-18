-- =============================================
-- SECURITY HARDENING: Restrict sensitive data access
-- =============================================

-- 1. PROFILES TABLE - Restrict to own profile + admins for their company only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can only view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view profiles ONLY of users in their company (not all profiles)
CREATE POLICY "Admins view company profiles only"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_members cm_admin
    JOIN public.company_members cm_target ON cm_admin.company_id = cm_target.company_id
    WHERE cm_admin.user_id = auth.uid()
    AND cm_target.user_id = profiles.user_id
    AND cm_admin.role = 'admin'
    AND cm_admin.is_active = true
    AND cm_target.is_active = true
  )
);

-- Super admins can view all profiles (for platform administration)
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- 2. LEADS TABLE - Restrict to admins and staff only (not regular users)
DROP POLICY IF EXISTS "Staff and admins can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins and sales can view leads" ON public.leads;
DROP POLICY IF EXISTS "Company members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view company leads" ON public.leads;

-- Only admins can view leads (contains sensitive prospect data)
CREATE POLICY "Only admins can view leads"
ON public.leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = leads.company_id
    AND cm.role = 'admin'
    AND cm.is_active = true
  )
  OR public.is_super_admin(auth.uid())
);

-- Only admins can insert leads
DROP POLICY IF EXISTS "Company members can insert leads" ON public.leads;
CREATE POLICY "Only admins can insert leads"
ON public.leads FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = leads.company_id
    AND cm.role = 'admin'
    AND cm.is_active = true
  )
);

-- Only admins can update leads
DROP POLICY IF EXISTS "Company members can update leads" ON public.leads;
CREATE POLICY "Only admins can update leads"
ON public.leads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = leads.company_id
    AND cm.role = 'admin'
    AND cm.is_active = true
  )
);

-- Only admins can delete leads
DROP POLICY IF EXISTS "Company members can delete leads" ON public.leads;
CREATE POLICY "Only admins can delete leads"
ON public.leads FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = leads.company_id
    AND cm.role = 'admin'
    AND cm.is_active = true
  )
);

-- 3. Add RLS to company_payment_settings_safe view
-- First drop and recreate with proper security
DROP VIEW IF EXISTS public.company_payment_settings_safe;
CREATE VIEW public.company_payment_settings_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  company_id,
  provider,
  square_application_id,
  square_environment,
  square_location_id,
  is_enabled,
  created_at,
  updated_at
FROM public.company_payment_settings
WHERE EXISTS (
  SELECT 1 FROM public.company_members cm
  WHERE cm.user_id = auth.uid()
  AND cm.company_id = company_payment_settings.company_id
  AND cm.role = 'admin'
  AND cm.is_active = true
)
OR public.is_super_admin(auth.uid());

GRANT SELECT ON public.company_payment_settings_safe TO authenticated;

-- 4. CLIENTS TABLE - Ensure only admins can see full client data
DROP POLICY IF EXISTS "Admins and staff can view company clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;

-- Only admins can view client data (contains emails, phones, addresses)
CREATE POLICY "Only admins can view clients"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = clients.company_id
    AND cm.role = 'admin'
    AND cm.is_active = true
  )
  OR public.is_super_admin(auth.uid())
);

-- Clients can view their own record
CREATE POLICY "Clients can view own record"
ON public.clients FOR SELECT
USING (portal_user_id = auth.uid());