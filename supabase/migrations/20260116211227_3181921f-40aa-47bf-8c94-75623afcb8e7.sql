-- Create promo_codes table for managing promotional codes
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'trial_extension')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  trial_extension_days INTEGER DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_plans TEXT[] DEFAULT ARRAY['professional', 'advanced', 'enterprise'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_promo_codes table for tracking which companies used which codes
CREATE TABLE public.company_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discount_applied NUMERIC,
  trial_extended_days INTEGER,
  UNIQUE(company_id, promo_code_id)
);

-- Create promo_email_campaigns table for email distribution
CREATE TABLE public.promo_email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_emails TEXT[],
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_codes (super admins only for management, public for validation)
CREATE POLICY "Super admins can manage promo codes"
ON public.promo_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Anyone can read active promo codes for validation"
ON public.promo_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- RLS policies for company_promo_codes
CREATE POLICY "Super admins can manage company promo codes"
ON public.company_promo_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Company members can view their promo codes"
ON public.company_promo_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = company_promo_codes.company_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can apply promo codes"
ON public.company_promo_codes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for promo_email_campaigns
CREATE POLICY "Super admins can manage email campaigns"
ON public.promo_email_campaigns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active, valid_from, valid_until);
CREATE INDEX idx_company_promo_codes_company ON public.company_promo_codes(company_id);
CREATE INDEX idx_promo_email_campaigns_promo ON public.promo_email_campaigns(promo_code_id);

-- Create trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_email_campaigns_updated_at
BEFORE UPDATE ON public.promo_email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();