-- Add billing_cycle column to companies table to track monthly vs yearly billing
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Add next_billing_date column for accurate billing tracking
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- Add discount tracking columns for easier querying
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_fixed_amount NUMERIC DEFAULT 0;

-- Add is_recurring column to company_promo_codes to track if discount applies to recurring charges
ALTER TABLE public.company_promo_codes 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Create index for billing queries
CREATE INDEX IF NOT EXISTS idx_companies_billing 
ON public.companies (subscription_status, next_billing_date) 
WHERE subscription_status = 'active';