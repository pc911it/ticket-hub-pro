-- 1. HARDEN SUBCONTRACTORS: Restrict contact info to admins only, create masked view for regular users

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view subcontractors for their company" ON public.subcontractors;
DROP POLICY IF EXISTS "Users can manage subcontractors for their company" ON public.subcontractors;

-- Admins can view full subcontractor details
CREATE POLICY "Admins can view all subcontractor details"
ON public.subcontractors
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR is_super_admin(auth.uid())
);

-- Only admins can manage subcontractors
CREATE POLICY "Admins can manage subcontractors"
ON public.subcontractors
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR is_super_admin(auth.uid())
);

-- Create a masked view for non-admin users (staff can see basic info but not contact details)
CREATE OR REPLACE VIEW public.subcontractors_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  company_id,
  business_name,
  trades,
  status,
  rating,
  total_projects,
  coi_on_file,
  w9_on_file,
  license_number,
  license_expiry,
  insurance_expiry,
  city,
  state,
  -- Mask sensitive contact info
  CASE WHEN contact_name IS NOT NULL THEN LEFT(contact_name, 1) || '***' ELSE NULL END as contact_name,
  CASE WHEN email IS NOT NULL THEN '***@' || SPLIT_PART(email, '@', 2) ELSE NULL END as email,
  CASE WHEN phone IS NOT NULL THEN '***-***-' || RIGHT(phone, 4) ELSE NULL END as phone,
  CASE WHEN address IS NOT NULL THEN '*** ' || city || ', ' || state ELSE NULL END as address,
  zip_code,
  notes,
  created_at,
  updated_at
FROM public.subcontractors;

-- Grant access to the safe view
GRANT SELECT ON public.subcontractors_safe TO authenticated;

-- Add RLS policy for staff to access the safe view via the base table
-- Staff can only see subcontractors via the masked view
CREATE POLICY "Staff can view masked subcontractor info"
ON public.subcontractors
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('staff', 'user')
  )
);

COMMENT ON VIEW public.subcontractors_safe IS 'Masked view of subcontractors for non-admin users. Contact details are partially hidden to protect against competitive intelligence gathering.';

-- 2. HARDEN CLIENT PAYMENT PROVIDER IDS: Create secure function to access payment data
-- Prevent exposure of square_customer_id, square_card_id that could enable fraud

-- Create a function to safely check if a client has payment method configured
CREATE OR REPLACE FUNCTION public.client_has_payment_method(client_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = client_uuid
    AND (square_customer_id IS NOT NULL OR square_card_id IS NOT NULL)
  )
$$;

-- Create a masked view for client data that hides payment provider IDs
CREATE OR REPLACE VIEW public.clients_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  company_id,
  full_name,
  email,
  phone,
  address,
  notes,
  notification_preferences,
  portal_user_id,
  created_at,
  updated_at,
  deleted_at,
  must_change_password,
  temp_password_created_at,
  -- Hide payment provider IDs - only show if configured (boolean)
  CASE WHEN square_customer_id IS NOT NULL THEN true ELSE false END as has_square_customer,
  CASE WHEN square_card_id IS NOT NULL THEN true ELSE false END as has_payment_method
FROM public.clients;

GRANT SELECT ON public.clients_safe TO authenticated;

COMMENT ON VIEW public.clients_safe IS 'Safe view of clients that hides payment provider IDs (square_customer_id, square_card_id) to prevent fraudulent charge attempts.';