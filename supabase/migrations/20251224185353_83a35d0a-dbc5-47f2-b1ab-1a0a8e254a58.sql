-- Create estimates table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  estimate_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  notes TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  valid_until DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  converted_to_invoice_id UUID REFERENCES public.client_invoices(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Require auth for estimates" 
ON public.estimates FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view estimates" 
ON public.estimates FOR SELECT 
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Staff and admins can manage estimates" 
ON public.estimates FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'staff') OR 
  is_company_admin(auth.uid(), company_id) OR 
  is_company_owner(auth.uid(), company_id)
);

CREATE POLICY "Clients can view their own estimates" 
ON public.estimates FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c
  JOIN profiles p ON p.email = c.email
  WHERE p.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_estimates_updated_at
BEFORE UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for estimates
ALTER PUBLICATION supabase_realtime ADD TABLE public.estimates;