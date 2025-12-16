-- Add notification preferences to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"status_updates": true, "work_completed": true, "agent_assigned": true, "new_invoice": true}'::jsonb;