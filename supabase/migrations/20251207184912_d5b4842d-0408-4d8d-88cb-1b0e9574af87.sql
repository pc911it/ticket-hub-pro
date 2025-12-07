-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create billing_history table to track payments
CREATE TABLE public.billing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  square_payment_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_history
CREATE POLICY "Company admins can view billing history"
ON public.billing_history
FOR SELECT
USING (
  is_company_admin(auth.uid(), company_id)
  OR is_company_owner(auth.uid(), company_id)
  OR is_super_admin(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_billing_history_company ON public.billing_history(company_id);
CREATE INDEX idx_billing_history_created ON public.billing_history(created_at DESC);