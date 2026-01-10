-- Create table for company payment settings (stores encrypted API keys per company)
CREATE TABLE public.company_payment_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'stripe' or 'square'
    is_enabled BOOLEAN DEFAULT false,
    -- Store encrypted/masked API keys (actual secrets stored in vault or passed at runtime)
    stripe_publishable_key TEXT,
    stripe_secret_key_encrypted TEXT,
    square_application_id TEXT,
    square_access_token_encrypted TEXT,
    square_location_id TEXT,
    square_environment TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'
    stripe_webhook_secret_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, provider)
);

-- Enable RLS
ALTER TABLE public.company_payment_settings ENABLE ROW LEVEL SECURITY;

-- Only company admins/owners can view their payment settings
CREATE POLICY "Company admins can view their payment settings"
ON public.company_payment_settings
FOR SELECT
USING (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    AND EXISTS (
        SELECT 1 FROM company_members 
        WHERE user_id = auth.uid() 
        AND company_id = company_payment_settings.company_id 
        AND role IN ('admin', 'super_admin')
    )
);

-- Only company admins/owners can insert payment settings
CREATE POLICY "Company admins can insert payment settings"
ON public.company_payment_settings
FOR INSERT
WITH CHECK (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    AND EXISTS (
        SELECT 1 FROM company_members 
        WHERE user_id = auth.uid() 
        AND company_id = company_payment_settings.company_id 
        AND role IN ('admin', 'super_admin')
    )
);

-- Only company admins/owners can update payment settings
CREATE POLICY "Company admins can update payment settings"
ON public.company_payment_settings
FOR UPDATE
USING (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    AND EXISTS (
        SELECT 1 FROM company_members 
        WHERE user_id = auth.uid() 
        AND company_id = company_payment_settings.company_id 
        AND role IN ('admin', 'super_admin')
    )
);

-- Only company admins/owners can delete payment settings
CREATE POLICY "Company admins can delete payment settings"
ON public.company_payment_settings
FOR DELETE
USING (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    AND EXISTS (
        SELECT 1 FROM company_members 
        WHERE user_id = auth.uid() 
        AND company_id = company_payment_settings.company_id 
        AND role IN ('admin', 'super_admin')
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_company_payment_settings_updated_at
BEFORE UPDATE ON public.company_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();