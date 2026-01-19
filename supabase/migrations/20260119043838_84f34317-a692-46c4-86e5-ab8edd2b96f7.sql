-- Add UPDATE policy for floor-plans bucket if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update floor plans'
  ) THEN
    CREATE POLICY "Authenticated users can update floor plans"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'floor-plans' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'floor-plans' AND auth.role() = 'authenticated');
  END IF;
END $$;