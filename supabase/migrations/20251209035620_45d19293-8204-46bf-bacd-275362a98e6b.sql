-- Drop existing update policy for tickets
DROP POLICY IF EXISTS "Company members can update tickets" ON public.tickets;

-- Create new update policy - only admin and staff can update tickets
CREATE POLICY "Staff and admins can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL) AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Add policy for clients to view their own tickets
CREATE POLICY "Clients can view their tickets" 
ON public.tickets 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);

-- Add policy for clients to view job updates on their tickets
DROP POLICY IF EXISTS "Company members can view job updates" ON public.job_updates;

CREATE POLICY "Company members can view job updates" 
ON public.job_updates 
FOR SELECT 
USING (
  ticket_id IN (
    SELECT t.id FROM public.tickets t
    WHERE t.company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  )
  OR
  ticket_id IN (
    SELECT t.id FROM public.tickets t
    JOIN public.clients c ON c.id = t.client_id
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);

-- Add policy for clients to view projects they are associated with
CREATE POLICY "Clients can view their projects" 
ON public.projects 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);