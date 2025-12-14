-- Add file attachment fields to project_comments
ALTER TABLE public.project_comments 
ADD COLUMN file_url text,
ADD COLUMN file_name text,
ADD COLUMN file_type text,
ADD COLUMN file_size integer;

-- Create storage bucket for project chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-chat-files', 'project-chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project chat files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-chat-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view chat files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-chat-files');

CREATE POLICY "Users can delete their own chat files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-chat-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);