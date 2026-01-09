-- Add deleted_at column to vessels table for soft delete
ALTER TABLE public.vessels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column to company_service_types table for soft delete
ALTER TABLE public.company_service_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;