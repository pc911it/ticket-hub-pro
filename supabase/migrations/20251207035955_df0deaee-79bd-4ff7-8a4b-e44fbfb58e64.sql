-- Add company_id to clients table
ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Drop old policy and create company-scoped policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Company members can view their clients"
ON public.clients FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Update insert policy to require company_id
DROP POLICY IF EXISTS "Admins and staff can insert clients" ON public.clients;
CREATE POLICY "Staff can insert clients for their company"
ON public.clients FOR INSERT
WITH CHECK (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

-- Update existing policies to include company check
DROP POLICY IF EXISTS "Admins and staff can update clients" ON public.clients;
CREATE POLICY "Staff can update their company clients"
ON public.clients FOR UPDATE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
);

DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Admins can delete their company clients"
ON public.clients FOR DELETE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  AND has_role(auth.uid(), 'admin')
);