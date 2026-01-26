-- Fix profiles RLS policies - Remove conflicting policies and create one clean policy
-- The issue: Multiple overlapping SELECT policies causing access issues

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles within their companies only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Create one unified SELECT policy that covers all cases:
-- 1. Users can view their own profile
-- 2. Company admins/staff can view profiles of users in their same company
-- 3. Super admins can view all profiles
CREATE POLICY "View profiles with proper access control" 
ON public.profiles FOR SELECT 
USING (
  -- Own profile
  user_id = auth.uid()
  OR
  -- Super admin
  is_super_admin(auth.uid())
  OR
  -- Company member viewing profiles of other members in same company
  EXISTS (
    SELECT 1 FROM public.company_members cm_viewer
    WHERE cm_viewer.user_id = auth.uid()
    AND cm_viewer.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.company_members cm_target
      WHERE cm_target.user_id = profiles.user_id
      AND cm_target.company_id = cm_viewer.company_id
      AND cm_target.is_active = true
    )
  )
);

-- Clean up duplicate agents policies
DROP POLICY IF EXISTS "Company members can view agents" ON public.agents;
DROP POLICY IF EXISTS "Company members can view basic agent info" ON public.agents;

-- Create single clean SELECT policy for agents
CREATE POLICY "Company members can view agents" 
ON public.agents FOR SELECT 
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);