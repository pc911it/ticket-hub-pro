-- Add trial_ends_at column to companies table
ALTER TABLE public.companies 
ADD COLUMN trial_ends_at timestamp with time zone DEFAULT (now() + interval '14 days');

-- Update existing companies to have trial end date set (14 days from their creation)
UPDATE public.companies 
SET trial_ends_at = created_at + interval '14 days'
WHERE trial_ends_at IS NULL;