-- Add business_config column to companies for storing business-specific settings
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_config JSONB DEFAULT '{}';

-- Create company_service_types table for tracking service types per company
CREATE TABLE IF NOT EXISTS public.company_service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_service_types ENABLE ROW LEVEL SECURITY;

-- Policies for company_service_types
CREATE POLICY "Users can view their company service types"
  ON public.company_service_types FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Admins can manage their company service types"
  ON public.company_service_types FOR ALL
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_service_types_company_id ON public.company_service_types(company_id);