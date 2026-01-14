-- Add visitor_email column to support_chats
ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS visitor_email TEXT;