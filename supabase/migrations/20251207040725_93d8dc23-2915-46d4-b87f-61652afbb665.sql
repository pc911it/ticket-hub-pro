-- Update inventory_items INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert inventory" ON public.inventory_items;
CREATE POLICY "Company members can insert inventory"
ON public.inventory_items FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Update inventory_usage INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert usage" ON public.inventory_usage;
CREATE POLICY "Company members can insert usage"
ON public.inventory_usage FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update purchase_orders INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert purchase orders" ON public.purchase_orders;
CREATE POLICY "Company members can insert purchase orders"
ON public.purchase_orders FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Update purchase_order_items INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert order items" ON public.purchase_order_items;
CREATE POLICY "Company members can insert order items"
ON public.purchase_order_items FOR INSERT
WITH CHECK (
  purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);

-- Update suppliers INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert suppliers" ON public.suppliers;
CREATE POLICY "Company members can insert suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Update project_milestones INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert milestones" ON public.project_milestones;
CREATE POLICY "Company members can insert milestones"
ON public.project_milestones FOR INSERT
WITH CHECK (has_project_access(auth.uid(), project_id));

-- Update project_attachments INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert project attachments" ON public.project_attachments;
CREATE POLICY "Company members can insert project attachments"
ON public.project_attachments FOR INSERT
WITH CHECK (has_project_access(auth.uid(), project_id));

-- Update ticket_attachments INSERT policy
DROP POLICY IF EXISTS "Staff and admins can insert attachments" ON public.ticket_attachments;
CREATE POLICY "Company members can insert ticket attachments"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM tickets WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  )
);