-- Add deleted_at column to inventory_items for soft delete (with recovery)
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add payment_provider column to companies for per-company payment provider selection
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'square';

-- Add boat_services to company_type enum
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'boat_services';

-- Add deleted_at to suppliers for soft delete
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient soft delete queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON public.inventory_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON public.suppliers(deleted_at);