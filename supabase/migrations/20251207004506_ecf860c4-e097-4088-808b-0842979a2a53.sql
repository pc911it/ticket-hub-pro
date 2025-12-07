-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their company logo
CREATE POLICY "Users can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to company logos
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow company owners to update their logo
CREATE POLICY "Users can update their company logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

-- Allow company owners to delete their logo
CREATE POLICY "Users can delete their company logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);