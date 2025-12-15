-- Add client signature and approval fields to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS client_signature_url text,
ADD COLUMN IF NOT EXISTS client_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_approved_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.tickets.client_signature_url IS 'URL of client signature image';
COMMENT ON COLUMN public.tickets.client_approved_at IS 'Timestamp when client approved the completed work';
COMMENT ON COLUMN public.tickets.client_approved_by IS 'User ID of the client who approved';

-- Create index for efficient querying of approved tickets
CREATE INDEX IF NOT EXISTS idx_tickets_client_approved_at ON public.tickets(client_approved_at) WHERE client_approved_at IS NOT NULL;

-- Create storage bucket for client request attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-request-attachments', 'client-request-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for client signatures if not exists  
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-signatures', 'client-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client-request-attachments bucket
CREATE POLICY "Authenticated users can upload client attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-request-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view client attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-request-attachments');

CREATE POLICY "Users can delete their own client attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-request-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for client-signatures bucket
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-signatures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-signatures');

-- Update tickets RLS to allow clients to update their own tickets for approval
CREATE POLICY "Clients can approve their completed tickets"
ON public.tickets FOR UPDATE
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
  AND status = 'completed'
)
WITH CHECK (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);