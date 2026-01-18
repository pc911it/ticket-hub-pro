-- Create table to store QuickBooks integrations per company
CREATE TABLE public.company_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'quickbooks', 'xero', etc.
  is_connected BOOLEAN DEFAULT false,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  realm_id VARCHAR(255), -- QuickBooks company ID
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider)
);

-- Enable RLS
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

-- Policies: Only company admins/owners can manage integrations
CREATE POLICY "Company admins can view their integrations"
  ON public.company_integrations FOR SELECT
  USING (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Company admins can insert integrations"
  ON public.company_integrations FOR INSERT
  WITH CHECK (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Company admins can update their integrations"
  ON public.company_integrations FOR UPDATE
  USING (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Company admins can delete their integrations"
  ON public.company_integrations FOR DELETE
  USING (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

-- Create trigger for updated_at
CREATE TRIGGER update_company_integrations_updated_at
  BEFORE UPDATE ON public.company_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to cache QuickBooks financial data
CREATE TABLE public.quickbooks_financial_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'profit_loss', 'balance_sheet', 'invoices', 'revenue_summary'
  period_start DATE,
  period_end DATE,
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quickbooks_financial_cache ENABLE ROW LEVEL SECURITY;

-- Policies for financial cache
CREATE POLICY "Company members can view their financial cache"
  ON public.quickbooks_financial_cache FOR SELECT
  USING (
    is_company_member(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert financial cache"
  ON public.quickbooks_financial_cache FOR INSERT
  WITH CHECK (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "System can update financial cache"
  ON public.quickbooks_financial_cache FOR UPDATE
  USING (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "System can delete financial cache"
  ON public.quickbooks_financial_cache FOR DELETE
  USING (
    is_company_admin(auth.uid(), company_id) 
    OR is_company_owner(auth.uid(), company_id)
    OR is_super_admin(auth.uid())
  );

-- Index for faster lookups
CREATE INDEX idx_company_integrations_company_provider ON public.company_integrations(company_id, provider);
CREATE INDEX idx_quickbooks_cache_company_type ON public.quickbooks_financial_cache(company_id, data_type);