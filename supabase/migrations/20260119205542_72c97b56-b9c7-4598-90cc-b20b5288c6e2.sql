-- SECURITY HARDENING MIGRATION
-- Addresses: Pricing exposure, Payment fees exposure, Promo code harvesting, Verification codes access

-- ============================================================
-- 1. PRICING STRATEGY PROTECTION
-- Create a public-safe view that only exposes necessary pricing info
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON public.subscription_plans;

-- Create a security definer function to get public pricing info only
CREATE OR REPLACE FUNCTION public.get_public_subscription_plans()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  monthly_price INTEGER,
  yearly_price INTEGER,
  is_custom_pricing BOOLEAN,
  is_popular BOOLEAN,
  trial_days INTEGER,
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    description,
    monthly_price,
    yearly_price,
    is_custom_pricing,
    is_popular,
    trial_days,
    sort_order
  FROM public.subscription_plans
  WHERE is_active = true
  ORDER BY sort_order;
$$;

-- Create restrictive policy - only super admins can directly query table
CREATE POLICY "Only super admins can query subscription_plans directly"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================================
-- 2. PAYMENT PROCESSING FEES PROTECTION
-- Hide internal fee structure from regular users
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Authenticated users can view pricing settings" ON public.pricing_settings;

-- Create security definer function for public pricing display
CREATE OR REPLACE FUNCTION public.get_public_pricing_settings()
RETURNS TABLE (
  yearly_discount_percent INTEGER,
  default_trial_days INTEGER,
  allow_monthly_billing BOOLEAN,
  allow_yearly_billing BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    yearly_discount_percent,
    default_trial_days,
    allow_monthly_billing,
    allow_yearly_billing
  FROM public.pricing_settings
  LIMIT 1;
$$;

-- Only super admins can see full pricing settings including fees
CREATE POLICY "Only super admins can view full pricing settings"
ON public.pricing_settings
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================================
-- 3. PROMO CODE HARVESTING PROTECTION
-- Replace direct table access with secure validation function
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read active promo codes for validation" ON public.promo_codes;

-- Create secure promo code validation function
-- Returns minimal info, rate-limited by application layer
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  _code TEXT,
  _plan TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  trial_extension_days INTEGER,
  promo_code_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
BEGIN
  -- Lookup the promo code
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = UPPER(TRIM(_code))
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > now())
    AND valid_from <= now();
  
  -- Code not found or inactive
  IF v_promo IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code'::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check usage limit
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT false, 'This promo code has reached its usage limit'::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check plan applicability
  IF _plan IS NOT NULL AND NOT (_plan = ANY(v_promo.applicable_plans)) THEN
    RETURN QUERY SELECT false, 'This promo code is not valid for the selected plan'::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;
  
  -- Valid promo code
  RETURN QUERY SELECT 
    true,
    NULL::TEXT,
    v_promo.discount_type,
    v_promo.discount_value,
    v_promo.trial_extension_days,
    v_promo.id;
END;
$$;

-- Only super admins can directly query promo_codes table
-- Regular users must use validate_promo_code function
CREATE POLICY "Only super admins can query promo_codes directly"
ON public.promo_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- ============================================================
-- 4. VERIFICATION CODES - PROPER SERVER-SIDE ACCESS
-- Replace blocking policy with secure function-based access
-- ============================================================

DROP POLICY IF EXISTS "No direct access to verification codes" ON public.verification_codes;

-- Create secure verification function for edge functions
CREATE OR REPLACE FUNCTION public.verify_code_internal(
  _identifier TEXT,
  _code TEXT,
  _type TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Find matching verification code
  SELECT * INTO v_record
  FROM public.verification_codes
  WHERE identifier = LOWER(_identifier)
    AND type = _type
    AND code = _code
    AND verified = false;
  
  IF v_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired verification code'::TEXT;
    RETURN;
  END IF;
  
  -- Check expiry
  IF v_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Verification code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Mark as verified
  UPDATE public.verification_codes
  SET verified = true
  WHERE id = v_record.id;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Create function for edge function to insert verification codes
CREATE OR REPLACE FUNCTION public.create_verification_code(
  _identifier TEXT,
  _type TEXT,
  _code TEXT,
  _expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Upsert verification code
  INSERT INTO public.verification_codes (identifier, type, code, expires_at, verified)
  VALUES (LOWER(_identifier), _type, _code, _expires_at, false)
  ON CONFLICT (identifier, type) 
  DO UPDATE SET 
    code = EXCLUDED.code,
    expires_at = EXCLUDED.expires_at,
    verified = false,
    created_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Add policy for service role only (edge functions)
CREATE POLICY "Service role can manage verification codes"
ON public.verification_codes
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- 5. PROMO CODE RATE LIMITING TABLE
-- Track validation attempts to prevent brute-force
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promo_validation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  user_id UUID,
  session_id TEXT,
  attempted_code TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Only super admins can view attempts (for auditing)
CREATE POLICY "Super admins can view promo validation attempts"
ON public.promo_validation_attempts
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert promo validation attempts"
ON public.promo_validation_attempts
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_promo_validation_ip_time 
ON public.promo_validation_attempts(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_validation_session_time 
ON public.promo_validation_attempts(session_id, created_at DESC);

-- ============================================================
-- 6. AUDIT: Log security-sensitive operations
-- ============================================================

-- Function to log promo code validation attempts
CREATE OR REPLACE FUNCTION public.log_promo_validation(
  _ip_address TEXT,
  _user_id UUID,
  _session_id TEXT,
  _code TEXT,
  _is_valid BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.promo_validation_attempts 
    (ip_address, user_id, session_id, attempted_code, is_valid)
  VALUES 
    (_ip_address, _user_id, _session_id, _code, _is_valid);
END;
$$;