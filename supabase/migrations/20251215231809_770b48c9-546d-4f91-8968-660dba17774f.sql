-- Enable realtime for job_updates table
ALTER TABLE public.job_updates REPLICA IDENTITY FULL;

-- Add job_updates to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'job_updates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_updates;
  END IF;
END
$$;

-- Also ensure tickets table has realtime enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END
$$;