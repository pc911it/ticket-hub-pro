-- Create table for subscription plan configuration
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  yearly_price INTEGER NOT NULL DEFAULT 0,
  is_custom_pricing BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 14,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for global pricing settings
CREATE TABLE public.pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  yearly_discount_percent INTEGER DEFAULT 17,
  default_trial_days INTEGER DEFAULT 14,
  payment_processing_fee_percent NUMERIC(5,2) DEFAULT 2.9,
  payment_processing_fee_fixed INTEGER DEFAULT 30,
  allow_monthly_billing BOOLEAN DEFAULT true,
  allow_yearly_billing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans - Everyone can read, super admins can write
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS policies for pricing_settings
CREATE POLICY "Anyone can view pricing settings"
ON public.pricing_settings
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage pricing settings"
ON public.pricing_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, description, monthly_price, yearly_price, is_custom_pricing, is_popular, sort_order) VALUES
('professional', 'Professional', 'Perfect for growing teams ready to scale operations', 34900, 299000, false, false, 1),
('advanced', 'Advanced', 'Complete solution for high-volume organizations', 89900, 749000, false, true, 2),
('enterprise', 'Enterprise', 'Tailored solutions for large-scale operations', 0, 0, true, false, 3);

-- Insert default pricing settings
INSERT INTO public.pricing_settings (yearly_discount_percent, default_trial_days, payment_processing_fee_percent, payment_processing_fee_fixed, allow_monthly_billing, allow_yearly_billing) 
VALUES (17, 14, 2.9, 30, true, true);

-- Add triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_settings_updated_at
BEFORE UPDATE ON public.pricing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();