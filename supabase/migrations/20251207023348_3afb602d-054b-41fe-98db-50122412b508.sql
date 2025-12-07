-- Add project_id to tickets to link them to projects
ALTER TABLE public.tickets
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_tickets_project_id ON public.tickets(project_id);