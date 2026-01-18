-- HARDEN STORAGE BUCKET RLS POLICIES
-- Remove overly permissive "Anyone can view" policies and replace with authenticated-only access

-- Drop the permissive "Anyone can view" policies
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view client attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view permit documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view submittal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view bid attachment files" ON storage.objects;

-- Create secure policies requiring authentication for viewing files

-- Project chat files - only authenticated users in the same company can view
CREATE POLICY "Authenticated users can view chat files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-chat-files' 
  AND auth.uid() IS NOT NULL
);

-- Client request attachments - only authenticated company members
CREATE POLICY "Authenticated users can view client attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-request-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Floor plans - only authenticated company members
CREATE POLICY "Authenticated users can view floor plans"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'floor-plans' 
  AND auth.uid() IS NOT NULL
);

-- Permit documents - only authenticated company members
CREATE POLICY "Authenticated users can view permit documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'permit-documents' 
  AND auth.uid() IS NOT NULL
);

-- Client signatures - only authenticated company members (sensitive!)
CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-signatures' 
  AND auth.uid() IS NOT NULL
);

-- Submittal attachments - only authenticated company members
CREATE POLICY "Authenticated users can view submittal attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submittal-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Ticket attachments - only authenticated company members
CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Bid attachments - only authenticated company members (competitive intelligence!)
CREATE POLICY "Authenticated users can view bid attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'bid-attachments' 
  AND auth.uid() IS NOT NULL
);