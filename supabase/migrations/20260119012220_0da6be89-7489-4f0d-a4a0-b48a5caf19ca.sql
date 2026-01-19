-- Add discount fields to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_fixed_amount integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_label text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_valid_until timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.subscription_plans.discount_percent IS 'Percentage discount to apply (0-100)';
COMMENT ON COLUMN public.subscription_plans.discount_fixed_amount IS 'Fixed discount amount in cents';
COMMENT ON COLUMN public.subscription_plans.discount_label IS 'Label to show for the discount (e.g., "Summer Sale")';
COMMENT ON COLUMN public.subscription_plans.discount_valid_until IS 'When the discount expires (null = no expiry)';