-- First, delete any tickets without a project_id (if any exist)
DELETE FROM public.tickets WHERE project_id IS NULL;

-- Make project_id required
ALTER TABLE public.tickets ALTER COLUMN project_id SET NOT NULL;