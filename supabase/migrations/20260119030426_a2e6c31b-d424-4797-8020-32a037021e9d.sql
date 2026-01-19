-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Restricted message viewing" ON public.support_chat_messages;

-- Drop duplicate/redundant policies to clean up
DROP POLICY IF EXISTS "Super admins and support admins can view all support chat messa" ON public.support_chat_messages;
DROP POLICY IF EXISTS "No direct message creation" ON public.support_chat_messages;