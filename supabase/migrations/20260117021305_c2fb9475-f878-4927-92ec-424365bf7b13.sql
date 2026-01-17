-- Fix remaining RLS policies with overly permissive "true" conditions

-- 1. Fix audit_logs INSERT - require authenticated user and membership in the company  
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Company members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Company members can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id IN (
    SELECT cm.company_id FROM public.company_members cm 
    WHERE cm.user_id = auth.uid() AND cm.is_active = true
  )
);

-- 2. Fix security_audit_log INSERT - require authenticated user
DROP POLICY IF EXISTS "System can insert security audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert their security logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can insert their own security logs" ON public.security_audit_log;
CREATE POLICY "Authenticated users can insert security logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix verification_codes - remove ALL policy with true
-- Edge functions using service role key bypass RLS automatically
DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.verification_codes;

-- No direct client access to verification codes - all access through edge functions with service role
-- Users cannot directly view, insert, update or delete verification codes
DROP POLICY IF EXISTS "Users can only view their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;

-- Block all direct client access (edge functions with service_role bypass RLS)
CREATE POLICY "No direct access to verification codes" 
ON public.verification_codes 
FOR ALL 
USING (false)
WITH CHECK (false);