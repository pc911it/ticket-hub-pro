-- =============================================
-- SECURITY HARDENING: Profiles Table
-- =============================================

-- Drop the overly permissive policies that allow viewing other profiles
DROP POLICY IF EXISTS "Company admins can view company member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view company profiles only" ON public.profiles;

-- Create a more restrictive policy for admins - only view profiles within their companies
CREATE POLICY "Admins can view profiles within their companies only"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR is_super_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM company_members cm_viewer
      WHERE cm_viewer.user_id = auth.uid()
        AND cm_viewer.role IN ('admin', 'staff')
        AND cm_viewer.is_active = true
        AND EXISTS (
          SELECT 1 FROM company_members cm_target
          WHERE cm_target.user_id = profiles.user_id
            AND cm_target.company_id = cm_viewer.company_id
            AND cm_target.is_active = true
        )
    )
  )
);

-- =============================================
-- SECURITY HARDENING: Company Payment Settings
-- =============================================

-- Add a restrictive base policy requiring authentication
ALTER TABLE public.company_payment_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with stricter controls
DROP POLICY IF EXISTS "Company admins can view their payment settings" ON public.company_payment_settings;
DROP POLICY IF EXISTS "Company admins can insert payment settings" ON public.company_payment_settings;
DROP POLICY IF EXISTS "Company admins can update payment settings" ON public.company_payment_settings;
DROP POLICY IF EXISTS "Company admins can delete payment settings" ON public.company_payment_settings;

-- Add restrictive base policy requiring authentication
CREATE POLICY "Require authentication for payment settings"
ON public.company_payment_settings
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Only company OWNERS (not just admins) can view payment settings
CREATE POLICY "Only company owners can view payment settings"
ON public.company_payment_settings
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_payment_settings.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can insert payment settings
CREATE POLICY "Only company owners can insert payment settings"
ON public.company_payment_settings
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_payment_settings.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can update payment settings
CREATE POLICY "Only company owners can update payment settings"
ON public.company_payment_settings
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_payment_settings.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can delete payment settings
CREATE POLICY "Only company owners can delete payment settings"
ON public.company_payment_settings
FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = company_payment_settings.company_id
      AND c.owner_id = auth.uid()
  )
);

-- =============================================
-- AUDIT LOG: Track payment settings access
-- =============================================

-- Create a trigger to log all payment settings changes
CREATE OR REPLACE FUNCTION public.audit_payment_settings_changes()
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
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN 'payment_settings_created'
      WHEN 'UPDATE' THEN 'payment_settings_updated'
      WHEN 'DELETE' THEN 'payment_settings_deleted'
    END,
    jsonb_build_object(
      'provider', COALESCE(NEW.provider, OLD.provider),
      'is_enabled', COALESCE(NEW.is_enabled, OLD.is_enabled),
      'operation', TG_OP
    ),
    'database_trigger'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS audit_payment_settings_trigger ON public.company_payment_settings;
CREATE TRIGGER audit_payment_settings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.company_payment_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_payment_settings_changes();