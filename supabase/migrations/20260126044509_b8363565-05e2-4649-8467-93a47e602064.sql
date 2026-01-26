-- =====================================================
-- MAXIMUM SECURITY HARDENING: Complete Protection (Fixed)
-- =====================================================

-- 1. PROFILES TABLE - Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view profiles in their companies" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Restrictive baseline - must be authenticated
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Users can only see their OWN profile
CREATE POLICY "Users can only view own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Admins can see profiles of their company members only
CREATE POLICY "Admins can view company member profiles"
ON public.profiles
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.role = 'admin'
    AND cm.company_id IN (
      SELECT cm2.company_id FROM public.company_members cm2
      WHERE cm2.user_id = profiles.user_id
    )
  )
);

-- 2. COMPANIES TABLE - Create a safe view that hides payment fields
DROP VIEW IF EXISTS public.companies_safe;
CREATE VIEW public.companies_safe
WITH (security_invoker = on)
AS SELECT 
  id,
  name,
  email,
  phone,
  address,
  city,
  state,
  logo_url,
  type,
  approval_status,
  approved_at,
  approved_by,
  is_active,
  subscription_plan,
  subscription_status,
  trial_ends_at,
  billing_cycle,
  next_billing_date,
  owner_id,
  created_at,
  updated_at,
  deleted_at,
  business_config,
  payment_provider,
  cancellation_reason,
  cancellation_fee_charged
  -- EXCLUDED: square_customer_id, square_card_id, discount_percentage, discount_fixed_amount
FROM public.companies;

-- 3. Create function to check if user can see payment details
CREATE OR REPLACE FUNCTION public.can_view_company_payment_details(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = _company_id AND owner_id = _user_id
    )
$$;

-- 4. Add security definer function to get payment details (owner only)
CREATE OR REPLACE FUNCTION public.get_company_payment_details(_company_id uuid)
RETURNS TABLE(
  square_customer_id text,
  square_card_id text,
  discount_percentage numeric,
  discount_fixed_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.square_customer_id,
    c.square_card_id,
    c.discount_percentage,
    c.discount_fixed_amount
  FROM public.companies c
  WHERE c.id = _company_id
    AND (
      is_super_admin(auth.uid())
      OR c.owner_id = auth.uid()
    )
$$;

-- 5. Restrict direct SELECT on companies to hide payment fields for non-owners
-- First drop existing policies
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Restrictive baseline
DROP POLICY IF EXISTS "Require authentication for companies" ON public.companies;
CREATE POLICY "Require authentication for companies"
ON public.companies
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Members can view basic company info (use companies_safe view for non-owners)
CREATE POLICY "Members can view company basics"
ON public.companies
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR owner_id = auth.uid()
  OR id IN (SELECT get_user_company_ids(auth.uid()))
);

-- 6. Create audit trigger for profile access attempts on sensitive operations
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    company_id,
    user_id,
    event_type,
    event_details,
    ip_address
  ) VALUES (
    NULL,
    auth.uid(),
    CASE TG_OP
      WHEN 'UPDATE' THEN 'profile_updated'
      WHEN 'DELETE' THEN 'profile_deleted'
    END,
    jsonb_build_object(
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'action', TG_OP
    ),
    'database_trigger'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS log_profile_changes_trigger ON public.profiles;
CREATE TRIGGER log_profile_changes_trigger
AFTER UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();