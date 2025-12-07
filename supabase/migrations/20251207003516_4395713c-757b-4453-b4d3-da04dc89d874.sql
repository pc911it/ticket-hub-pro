-- Add more company types
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'electrician';
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'plumber';
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'hvac';
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'security';
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'locksmith';

-- Add state and city columns to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;

-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add subscription plan to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'starter';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial';