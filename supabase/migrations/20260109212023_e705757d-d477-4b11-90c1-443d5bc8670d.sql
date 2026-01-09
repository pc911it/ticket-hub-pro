-- Add vessel_id to tickets table
ALTER TABLE public.tickets 
ADD COLUMN vessel_id uuid REFERENCES public.vessels(id) ON DELETE SET NULL;

-- Create vessel_photos table for storing vessel images
CREATE TABLE public.vessel_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vessel_id uuid NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  category text NOT NULL DEFAULT 'general',
  description text,
  uploaded_by uuid,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vessel_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for vessel_photos
CREATE POLICY "Require authentication for vessel_photos"
ON public.vessel_photos FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view vessel photos in their company"
ON public.vessel_photos FOR SELECT
USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Users can create vessel photos in their company"
ON public.vessel_photos FOR INSERT
WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Company admins can delete vessel photos"
ON public.vessel_photos FOR DELETE
USING (is_company_admin(company_id, auth.uid()) OR is_company_owner(company_id, auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_tickets_vessel_id ON public.tickets(vessel_id);
CREATE INDEX idx_vessel_photos_vessel_id ON public.vessel_photos(vessel_id);
CREATE INDEX idx_vessel_photos_ticket_id ON public.vessel_photos(ticket_id);