-- Add topic/department and order reference to support_chats
ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS topic text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS order_reference text,
ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ended_by uuid,
ADD COLUMN IF NOT EXISTS transferred_from uuid,
ADD COLUMN IF NOT EXISTS transfer_reason text;

-- Add department column to support_tickets if not exists
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS department text;

-- Create index for filtering by topic/department
CREATE INDEX IF NOT EXISTS idx_support_chats_topic ON public.support_chats(topic);
CREATE INDEX IF NOT EXISTS idx_support_chats_department ON public.support_chats(department);
CREATE INDEX IF NOT EXISTS idx_support_tickets_department ON public.support_tickets(department);