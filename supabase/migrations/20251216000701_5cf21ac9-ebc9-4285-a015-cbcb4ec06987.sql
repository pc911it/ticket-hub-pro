-- Add Square card fields to clients table for storing payment cards independently
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS square_customer_id text,
ADD COLUMN IF NOT EXISTS square_card_id text;