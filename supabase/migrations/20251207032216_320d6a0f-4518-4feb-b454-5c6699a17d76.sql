-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins and staff can insert tickets" ON public.tickets;

-- Create new policy that allows company members to insert tickets
CREATE POLICY "Company members can insert tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated and be a member of a company
  auth.uid() IS NOT NULL 
  AND (
    -- Allow if user has admin or staff role
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'staff'::app_role)
    -- Or if user is a member of any company (dispatchers, owners)
    OR EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- Also update the update policy to allow company members
DROP POLICY IF EXISTS "Admins and staff can update tickets" ON public.tickets;

CREATE POLICY "Company members can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'staff'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  )
);