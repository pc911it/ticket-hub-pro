-- Drop existing policies on subscription_plans
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON public.subscription_plans;

-- Drop existing policies on pricing_settings
DROP POLICY IF EXISTS "Super admins can manage pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Anyone can view pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Public can view pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Authenticated users can view pricing settings" ON public.pricing_settings;

-- Enable RLS (if not already)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION_PLANS: Only authenticated users can read
CREATE POLICY "Authenticated users can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);

-- SUBSCRIPTION_PLANS: Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- PRICING_SETTINGS: Only authenticated users can read
CREATE POLICY "Authenticated users can view pricing settings"
ON public.pricing_settings
FOR SELECT
TO authenticated
USING (true);

-- PRICING_SETTINGS: Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage pricing settings"
ON public.pricing_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));