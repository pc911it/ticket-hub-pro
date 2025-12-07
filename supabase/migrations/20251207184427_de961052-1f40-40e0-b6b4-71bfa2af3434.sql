-- Add Square payment columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS square_customer_id TEXT,
ADD COLUMN IF NOT EXISTS square_card_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_square_customer ON public.companies(square_customer_id) WHERE square_customer_id IS NOT NULL;