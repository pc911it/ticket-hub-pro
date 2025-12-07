-- Drop and recreate the INSERT policy to allow all company members to create clients
DROP POLICY IF EXISTS "Staff can insert clients for their company" ON public.clients;

CREATE POLICY "Company members can insert clients for their company"
ON public.clients
FOR INSERT
WITH CHECK (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);