-- =============================================
-- SECURITY HARDENING: Leads Table - Audit Logging
-- Track all access to sensitive lead data
-- =============================================

-- Create audit trigger for leads table to track all changes
CREATE OR REPLACE FUNCTION public.audit_leads_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    'lead',
    COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS audit_leads_trigger ON public.leads;
CREATE TRIGGER audit_leads_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.audit_leads_changes();

-- Restrict leads access to ONLY company owners (not all admins)
DROP POLICY IF EXISTS "Only admins can view leads" ON public.leads;
DROP POLICY IF EXISTS "Only admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Only admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Only admins can delete leads" ON public.leads;

-- Only company OWNERS can view leads
CREATE POLICY "Only company owners can view leads"
ON public.leads
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = leads.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can insert leads
CREATE POLICY "Only company owners can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = leads.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can update leads
CREATE POLICY "Only company owners can update leads"
ON public.leads
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = leads.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Only company OWNERS can delete leads
CREATE POLICY "Only company owners can delete leads"
ON public.leads
FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = leads.company_id
      AND c.owner_id = auth.uid()
  )
);