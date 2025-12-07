-- Create purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  order_number TEXT NOT NULL,
  supplier TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  expected_delivery_date DATE,
  total_cost NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC,
  quantity_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_orders
CREATE POLICY "Company members can view purchase orders"
ON public.purchase_orders
FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Staff and admins can insert purchase orders"
ON public.purchase_orders
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can update purchase orders"
ON public.purchase_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can delete purchase orders"
ON public.purchase_orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for purchase_order_items
CREATE POLICY "Users can view order items for accessible orders"
ON public.purchase_order_items
FOR SELECT
USING (purchase_order_id IN (
  SELECT id FROM public.purchase_orders 
  WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
));

CREATE POLICY "Staff and admins can insert order items"
ON public.purchase_order_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can update order items"
ON public.purchase_order_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can delete order items"
ON public.purchase_order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();