-- Update delete policy to allow company members to delete tickets
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

CREATE POLICY "Company members can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE user_id = auth.uid()
    )
  )
);