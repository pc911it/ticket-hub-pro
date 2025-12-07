-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  unit TEXT DEFAULT 'unit',
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  cost_per_unit DECIMAL(10,2),
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory usage table to track materials used per ticket
CREATE TABLE public.inventory_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  quantity_planned INTEGER DEFAULT 0,
  usage_type TEXT DEFAULT 'used', -- 'used', 'planned', 'returned'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_usage ENABLE ROW LEVEL SECURITY;

-- Inventory items policies
CREATE POLICY "Company members can view inventory"
ON public.inventory_items
FOR SELECT
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Staff and admins can insert inventory"
ON public.inventory_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff and admins can update inventory"
ON public.inventory_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Admins can delete inventory"
ON public.inventory_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Inventory usage policies
CREATE POLICY "Authenticated users can view usage"
ON public.inventory_usage
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and admins can insert usage"
ON public.inventory_usage
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff and admins can update usage"
ON public.inventory_usage
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Admins can delete usage"
ON public.inventory_usage
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();