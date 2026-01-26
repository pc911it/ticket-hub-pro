-- =============================================
-- ENABLE REALTIME for key business tables (if not already enabled)
-- This allows live updates without page refresh
-- =============================================

DO $$
DECLARE
  tables_to_add TEXT[] := ARRAY[
    'projects', 'clients', 'agents', 'inventory_items', 
    'client_invoices', 'company_members', 'job_updates', 
    'bids', 'estimates', 'permits', 'equipment'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = t 
      AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Added table % to supabase_realtime publication', t;
    END IF;
  END LOOP;
END $$;