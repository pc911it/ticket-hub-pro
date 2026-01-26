-- =====================================================
-- SECURITY HARDENING: Continue protecting User Emails & Financial Data
-- =====================================================

-- 1. PROTECT USER EMAIL ADDRESSES IN PROFILES TABLE
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view profiles in their companies" ON public.profiles;

-- Create restrictive policy: Users can only see profiles within their own companies
CREATE POLICY "Users can only view profiles in their companies"
ON public.profiles
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR user_id IN (
    SELECT cm.user_id 
    FROM public.company_members cm
    WHERE cm.company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

-- 2. PROTECT CLIENT PAYMENTS TABLE
DROP POLICY IF EXISTS "Company members can view client payments" ON public.client_payments;
DROP POLICY IF EXISTS "Only owners can view client payments" ON public.client_payments;

CREATE POLICY "Only admins can view client payments"
ON public.client_payments
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = client_payments.company_id
    AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_payments.company_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- 3. PROTECT CLIENT SUBSCRIPTIONS TABLE  
DROP POLICY IF EXISTS "Company members can view client subscriptions" ON public.client_subscriptions;
DROP POLICY IF EXISTS "Only admins can view client subscriptions" ON public.client_subscriptions;

CREATE POLICY "Only admins can view client subscriptions"
ON public.client_subscriptions
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = client_subscriptions.company_id
    AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_subscriptions.company_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- 4. PROTECT CLIENT INVOICES - Financial data
DROP POLICY IF EXISTS "Company members can view client invoices" ON public.client_invoices;
DROP POLICY IF EXISTS "Only admins can view client invoices" ON public.client_invoices;

CREATE POLICY "Only admins can view client invoices"
ON public.client_invoices
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = client_invoices.company_id
    AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = client_invoices.company_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- 5. Add restrictive baseline to billing_history requiring auth
DROP POLICY IF EXISTS "Require authentication for billing history" ON public.billing_history;

CREATE POLICY "Require authentication for billing history"
ON public.billing_history
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- 6. Add restrictive baseline to client_payments requiring auth
DROP POLICY IF EXISTS "Require authentication for client payments" ON public.client_payments;

CREATE POLICY "Require authentication for client payments"
ON public.client_payments
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- 7. Add restrictive baseline to client_subscriptions requiring auth
DROP POLICY IF EXISTS "Require authentication for client subscriptions" ON public.client_subscriptions;

CREATE POLICY "Require authentication for client subscriptions"
ON public.client_subscriptions
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- 8. Add restrictive baseline to client_invoices requiring auth
DROP POLICY IF EXISTS "Require authentication for client invoices" ON public.client_invoices;

CREATE POLICY "Require authentication for client invoices"
ON public.client_invoices
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);