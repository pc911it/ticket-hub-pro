-- Add deleted_at column to companies table for soft delete
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add cancellation_fee_charged column to track if fee was charged
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS cancellation_fee_charged boolean DEFAULT false;

-- Add cancellation_reason column
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Update the purge function to include companies
CREATE OR REPLACE FUNCTION public.purge_old_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete companies older than 30 days (this will cascade to related data)
  DELETE FROM public.companies 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';

  -- Delete projects older than 30 days
  DELETE FROM public.projects 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Delete tickets older than 30 days
  DELETE FROM public.tickets 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Delete clients older than 30 days
  DELETE FROM public.clients 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Update RLS policies to exclude soft-deleted companies from normal views
CREATE POLICY "Exclude deleted companies from view"
ON public.companies
FOR SELECT
USING (deleted_at IS NULL OR is_super_admin(auth.uid()));

-- Allow super admin or owner to update company for deletion
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
CREATE POLICY "Owners or super admin can update their company"
ON public.companies
FOR UPDATE
USING (owner_id = auth.uid() OR is_super_admin(auth.uid()));