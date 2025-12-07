-- Create project_agents junction table for assigning agents to projects
CREATE TABLE public.project_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(project_id, agent_id)
);

-- Enable RLS
ALTER TABLE public.project_agents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view project agents"
ON public.project_agents
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can manage project agents"
ON public.project_agents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

-- Enable realtime for project_agents
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_agents;