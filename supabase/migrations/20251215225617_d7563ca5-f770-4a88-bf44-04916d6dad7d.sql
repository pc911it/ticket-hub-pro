-- Add password security columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS require_monthly_password_reset BOOLEAN DEFAULT false;

-- Update existing profiles to have current timestamp for password_changed_at
UPDATE public.profiles SET password_changed_at = now() WHERE password_changed_at IS NULL;