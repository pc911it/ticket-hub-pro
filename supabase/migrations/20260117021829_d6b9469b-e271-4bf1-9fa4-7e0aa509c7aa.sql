-- Add security improvements for signature URLs
-- These columns store URLs to signed documents that should have restricted access

-- 1. Add a comment documenting that signature_url columns should use private storage
COMMENT ON COLUMN public.contracts.client_signature_url IS 'URL to client signature image - MUST use private storage bucket with signed URLs';
COMMENT ON COLUMN public.contracts.company_signature_url IS 'URL to company signature image - MUST use private storage bucket with signed URLs';
COMMENT ON COLUMN public.change_orders.client_signature_url IS 'URL to client signature image - MUST use private storage bucket with signed URLs';
COMMENT ON COLUMN public.bids.client_signature_url IS 'URL to client signature image - MUST use private storage bucket with signed URLs';
COMMENT ON COLUMN public.tickets.client_signature_url IS 'URL to client signature image - MUST use private storage bucket with signed URLs';

-- 2. Create a storage bucket for signatures if it doesn't exist (this is informational - actual bucket creation happens in storage settings)
-- Storage buckets should be private by default

-- 3. Add RLS policy notes for signature access
-- Signature URLs should only be visible to:
-- - Company members who can view the parent record
-- - The client who signed (via client portal)

-- Add audit logging for signature access
CREATE TABLE IF NOT EXISTS public.signature_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  signature_type TEXT NOT NULL, -- 'client' or 'company'
  accessed_by UUID,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on signature access log
ALTER TABLE public.signature_access_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view signature access logs
CREATE POLICY "Super admins can view signature access logs"
ON public.signature_access_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Authenticated users can insert their own access logs
CREATE POLICY "Authenticated users can log signature access"
ON public.signature_access_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);