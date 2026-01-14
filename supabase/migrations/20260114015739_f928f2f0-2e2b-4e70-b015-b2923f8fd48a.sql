-- Add channel column to track how visitor is chatting
ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web';

-- Add phone number for SMS/WhatsApp visitors
ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS visitor_phone TEXT;

-- Add channel to messages for tracking
ALTER TABLE public.support_chat_messages 
ADD COLUMN IF NOT EXISTS channel TEXT;

-- Create index for phone lookup
CREATE INDEX IF NOT EXISTS idx_support_chats_visitor_phone 
ON public.support_chats(visitor_phone) 
WHERE visitor_phone IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.support_chats.channel IS 'Channel type: web, sms, or whatsapp';
COMMENT ON COLUMN public.support_chats.visitor_phone IS 'Phone number for SMS/WhatsApp visitors';
COMMENT ON COLUMN public.support_chat_messages.channel IS 'Channel the message was sent through';