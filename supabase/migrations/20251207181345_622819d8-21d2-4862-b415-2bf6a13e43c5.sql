-- Update DELETE policies to allow company admins (not just owners) to delete records

-- Drop and recreate clients delete policy
DROP POLICY IF EXISTS "Company owners can delete clients" ON public.clients;
CREATE POLICY "Company admins can delete clients" 
ON public.clients 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);

-- Drop and recreate inventory_items delete policy
DROP POLICY IF EXISTS "Company owners can delete inventory" ON public.inventory_items;
CREATE POLICY "Company admins can delete inventory" 
ON public.inventory_items 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);

-- Drop and recreate inventory_usage delete policy
DROP POLICY IF EXISTS "Company owners can delete usage" ON public.inventory_usage;
CREATE POLICY "Company admins can delete usage" 
ON public.inventory_usage 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = inventory_usage.ticket_id
    AND (
      is_company_admin(auth.uid(), t.company_id)
      OR is_company_owner(auth.uid(), t.company_id) 
      OR is_super_admin(auth.uid())
    )
  )
);

-- Drop and recreate project_milestones delete policy
DROP POLICY IF EXISTS "Company owners can delete milestones" ON public.project_milestones;
CREATE POLICY "Company admins can delete milestones" 
ON public.project_milestones 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_milestones.project_id
    AND (
      is_company_admin(auth.uid(), p.company_id)
      OR is_company_owner(auth.uid(), p.company_id) 
      OR is_super_admin(auth.uid())
    )
  )
);

-- Drop and recreate project_attachments delete policy
DROP POLICY IF EXISTS "Staff and admins can delete project attachments" ON public.project_attachments;
CREATE POLICY "Company admins can delete project attachments" 
ON public.project_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_attachments.project_id
    AND (
      is_company_admin(auth.uid(), p.company_id)
      OR is_company_owner(auth.uid(), p.company_id) 
      OR is_super_admin(auth.uid())
    )
  )
);

-- Drop and recreate purchase_order_items delete policy
DROP POLICY IF EXISTS "Company owners can delete order items" ON public.purchase_order_items;
CREATE POLICY "Company admins can delete order items" 
ON public.purchase_order_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      is_company_admin(auth.uid(), po.company_id)
      OR is_company_owner(auth.uid(), po.company_id) 
      OR is_super_admin(auth.uid())
    )
  )
);

-- Drop and recreate purchase_orders delete policy
DROP POLICY IF EXISTS "Company owners can delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Company admins can delete purchase orders" 
ON public.purchase_orders 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);

-- Drop and recreate suppliers delete policy
DROP POLICY IF EXISTS "Company owners can delete suppliers" ON public.suppliers;
CREATE POLICY "Company admins can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);

-- Drop and recreate ticket_attachments delete policy
DROP POLICY IF EXISTS "Staff and admins can delete attachments" ON public.ticket_attachments;
CREATE POLICY "Company admins can delete ticket attachments" 
ON public.ticket_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND (
      is_company_admin(auth.uid(), t.company_id)
      OR is_company_owner(auth.uid(), t.company_id) 
      OR is_super_admin(auth.uid())
    )
  )
);

-- Drop and recreate tickets delete policy
DROP POLICY IF EXISTS "Company owners can delete tickets" ON public.tickets;
CREATE POLICY "Company admins can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);

-- Drop and recreate projects delete policy
DROP POLICY IF EXISTS "Company owners can delete projects" ON public.projects;
CREATE POLICY "Company admins can delete projects" 
ON public.projects 
FOR DELETE 
USING (
  is_company_admin(auth.uid(), company_id) 
  OR is_company_owner(auth.uid(), company_id) 
  OR is_super_admin(auth.uid())
);