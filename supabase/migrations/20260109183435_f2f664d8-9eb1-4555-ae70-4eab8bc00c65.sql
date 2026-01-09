-- Create vessels table for boat information linked to clients
CREATE TABLE public.vessels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  boat_name TEXT NOT NULL,
  hull_id TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  length TEXT,
  slip_location TEXT,
  engine_type TEXT,
  fuel_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;

-- RLS policies for vessels
CREATE POLICY "Users can view vessels in their company"
ON public.vessels FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Users can create vessels in their company"
ON public.vessels FOR INSERT
WITH CHECK (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Users can update vessels in their company"
ON public.vessels FOR UPDATE
USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company admins can delete vessels"
ON public.vessels FOR DELETE
USING (public.is_company_admin(company_id, auth.uid()) OR public.is_company_owner(company_id, auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vessels_updated_at
BEFORE UPDATE ON public.vessels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();