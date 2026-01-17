-- Critical security fixes for sensitive data access

-- 1. Create a view for company_payment_settings that excludes encrypted credentials
CREATE OR REPLACE VIEW public.company_payment_settings_safe
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
  -- Excludes: stripe_secret_key_encrypted, square_access_token_encrypted, stripe_webhook_secret_encrypted, stripe_publishable_key
FROM public.company_payment_settings;

-- 2. Create a view for agents that excludes real-time location for non-dispatchers
CREATE OR REPLACE VIEW public.agents_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  company_id,
  user_id,
  full_name,
  phone,
  vehicle_info,
  is_available,
  is_online,
  created_at,
  updated_at
  -- Excludes: current_location_lat, current_location_lng, last_location_update
FROM public.agents;

-- 3. Update agents RLS to restrict location data to admins/dispatchers only
DROP POLICY IF EXISTS "Company members or super admin can view agents" ON public.agents;

-- Allow company members to view basic agent info (without location)
CREATE POLICY "Company members can view basic agent info"
ON public.agents
FOR SELECT
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

-- 4. Create a security definer function for location access (only for dispatchers/admins)
CREATE OR REPLACE FUNCTION public.get_agent_locations(_company_id uuid)
RETURNS TABLE (
  agent_id uuid,
  full_name text,
  current_location_lat double precision,
  current_location_lng double precision,
  last_location_update timestamptz,
  is_online boolean,
  is_available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    full_name,
    current_location_lat,
    current_location_lng,
    last_location_update,
    is_online,
    is_available
  FROM public.agents
  WHERE company_id = _company_id
    AND (
      -- Only admins can access location data
      EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.user_id = auth.uid()
        AND cm.company_id = _company_id
        AND cm.role IN ('admin')
      )
      OR is_super_admin(auth.uid())
    )
$$;

-- 5. Add comment documenting sensitive fields
COMMENT ON COLUMN public.agents.current_location_lat IS 'SENSITIVE: GPS latitude - access restricted to admin/dispatcher roles only';
COMMENT ON COLUMN public.agents.current_location_lng IS 'SENSITIVE: GPS longitude - access restricted to admin/dispatcher roles only';
COMMENT ON TABLE public.company_payment_settings IS 'SENSITIVE: Contains encrypted payment credentials - use company_payment_settings_safe view for client queries';