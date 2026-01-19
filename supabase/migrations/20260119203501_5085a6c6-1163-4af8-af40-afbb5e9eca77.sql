-- Fix agents table RLS policies to allow super admins full access

-- Drop existing policy that doesn't include super admin check for INSERT
DROP POLICY IF EXISTS "Dispatchers and admins can manage agents" ON public.agents;

-- Create comprehensive policy for managing agents (includes super admin)
CREATE POLICY "Admins and super admins can manage agents"
ON public.agents
FOR ALL
USING (
  -- Company admin/staff can manage their company's agents
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = agents.company_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'staff')
  )
  -- Super admins can manage any agent
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  -- Company admin/staff can insert/update for their company
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = agents.company_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'staff')
  )
  -- Super admins can insert/update for any company
  OR is_super_admin(auth.uid())
);