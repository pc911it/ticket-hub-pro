-- Drop the old restrictive status constraint
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Add new constraint with all workflow statuses
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'en_route'::text, 'on_site'::text, 'working'::text, 'completed'::text, 'cancelled'::text, 'confirmed'::text]));