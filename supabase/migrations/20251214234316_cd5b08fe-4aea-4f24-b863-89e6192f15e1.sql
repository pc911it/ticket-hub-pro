-- Add soft delete columns to projects, tickets, and clients tables
ALTER TABLE public.projects 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.tickets 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.clients 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for efficient filtering
CREATE INDEX idx_projects_deleted_at ON public.projects(deleted_at);
CREATE INDEX idx_tickets_deleted_at ON public.tickets(deleted_at);
CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at);

-- Create function to auto-purge items older than 30 days
CREATE OR REPLACE FUNCTION public.purge_old_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete projects older than 30 days (cascade will handle related data)
  DELETE FROM public.projects 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Delete tickets older than 30 days
  DELETE FROM public.tickets 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Delete clients older than 30 days
  DELETE FROM public.clients 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;