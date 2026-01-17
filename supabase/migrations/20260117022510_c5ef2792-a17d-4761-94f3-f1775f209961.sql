-- Fix views to use security_invoker (not definer)
DROP VIEW IF EXISTS public.company_payment_settings_safe;
DROP VIEW IF EXISTS public.agents_safe;

-- Recreate with security_invoker = true (runs with querying user's permissions)
CREATE VIEW public.company_payment_settings_safe
WITH (security_invoker = true) AS
SELECT 
  id, company_id, provider, square_application_id, square_environment,
  square_location_id, is_enabled, created_at, updated_at
FROM public.company_payment_settings;

CREATE VIEW public.agents_safe
WITH (security_invoker = true) AS
SELECT 
  id, company_id, user_id, full_name, phone, vehicle_info,
  is_available, is_online, created_at, updated_at
FROM public.agents;

GRANT SELECT ON public.company_payment_settings_safe TO authenticated;
GRANT SELECT ON public.agents_safe TO authenticated;