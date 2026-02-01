-- First create the helper function
CREATE OR REPLACE FUNCTION public.can_view_supplier_contacts(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_company_owner(_user_id, _company_id)
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.user_id = _user_id
        AND cm.company_id = _company_id
        AND cm.role = 'admin'
        AND cm.is_active = true
    )
$$;

-- Create a safe view for suppliers that hides contact info from non-privileged users
CREATE OR REPLACE VIEW public.suppliers_safe AS
SELECT 
  id,
  company_id,
  name,
  CASE 
    WHEN can_view_supplier_contacts(auth.uid(), company_id) THEN contact_name
    ELSE '***RESTRICTED***'
  END AS contact_name,
  CASE 
    WHEN can_view_supplier_contacts(auth.uid(), company_id) THEN email
    ELSE '***RESTRICTED***'
  END AS email,
  CASE 
    WHEN can_view_supplier_contacts(auth.uid(), company_id) THEN phone
    ELSE '***RESTRICTED***'
  END AS phone,
  CASE 
    WHEN can_view_supplier_contacts(auth.uid(), company_id) THEN address
    ELSE '***RESTRICTED***'
  END AS address,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM public.suppliers;

-- Grant access to the view
GRANT SELECT ON public.suppliers_safe TO authenticated;

-- Update RLS on suppliers table - restrict direct access to admins only
DROP POLICY IF EXISTS "Company members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Company admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

-- Only admins and owners can directly access the suppliers table
CREATE POLICY "Only admins can access suppliers directly"
ON public.suppliers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_company_owner(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = suppliers.company_id
      AND cm.role = 'admin'
      AND cm.is_active = true
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR is_company_owner(auth.uid(), company_id)
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = suppliers.company_id
      AND cm.role = 'admin'
      AND cm.is_active = true
  )
);

-- Create audit logging for supplier access
CREATE OR REPLACE FUNCTION public.audit_supplier_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    'supplier_' || LOWER(TG_OP),
    jsonb_build_object(
      'supplier_id', COALESCE(NEW.id, OLD.id),
      'supplier_name', COALESCE(NEW.name, OLD.name),
      'operation', TG_OP
    ),
    'rls_trigger'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_supplier_access_trigger ON public.suppliers;

CREATE TRIGGER audit_supplier_access_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.audit_supplier_access();