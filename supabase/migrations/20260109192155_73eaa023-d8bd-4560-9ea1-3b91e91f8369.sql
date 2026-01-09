-- Drop the existing update policy
DROP POLICY IF EXISTS "Staff and admins can update inventory" ON public.inventory_items;

-- Create a new update policy that allows company members with appropriate permissions
CREATE POLICY "Company members can update inventory"
ON public.inventory_items
FOR UPDATE
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);