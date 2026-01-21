-- =============================================
-- SECURITY HARDENING: Subcontractors Table
-- Add authentication requirement to prevent anonymous access
-- =============================================

-- Add restrictive base policy requiring authentication
CREATE POLICY "Require authentication for subcontractors"
ON public.subcontractors
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);