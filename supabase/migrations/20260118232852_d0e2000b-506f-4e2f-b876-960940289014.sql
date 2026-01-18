-- Make storage buckets private for security
-- ticket-attachments bucket
UPDATE storage.buckets SET public = false WHERE id = 'ticket-attachments';

-- client-signatures bucket (contains sensitive data)
UPDATE storage.buckets SET public = false WHERE id = 'client-signatures';

-- bid-attachments bucket
UPDATE storage.buckets SET public = false WHERE id = 'bid-attachments';

-- rfi-attachments bucket
UPDATE storage.buckets SET public = false WHERE id = 'rfi-attachments';

-- submittal-attachments bucket
UPDATE storage.buckets SET public = false WHERE id = 'submittal-attachments';

-- floor-plans bucket
UPDATE storage.buckets SET public = false WHERE id = 'floor-plans';

-- permit-documents bucket
UPDATE storage.buckets SET public = false WHERE id = 'permit-documents';

-- project-chat-files bucket
UPDATE storage.buckets SET public = false WHERE id = 'project-chat-files';

-- client-request-attachments bucket
UPDATE storage.buckets SET public = false WHERE id = 'client-request-attachments';

-- Keep company-logos public as they are meant for public display