-- Add unique constraint on clients table for email within company
-- This prevents duplicate emails per company at the database level
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_company_unique 
ON public.clients (email, company_id) 
WHERE deleted_at IS NULL;

-- Add unique constraint on profiles table for email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique 
ON public.profiles (email) 
WHERE email IS NOT NULL;