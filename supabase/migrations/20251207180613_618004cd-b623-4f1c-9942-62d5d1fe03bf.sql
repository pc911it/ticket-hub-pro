-- Enable realtime for tickets table (notifications and job_updates already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Enable full replica identity for complete row data in updates
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.job_updates REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;