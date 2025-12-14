-- Create project_comments table for project-level chat
CREATE TABLE public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Require authentication
CREATE POLICY "Require authentication for project_comments"
ON public.project_comments
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Users with project access can view comments
CREATE POLICY "Users with project access can view comments"
ON public.project_comments
FOR SELECT
USING (has_project_access(auth.uid(), project_id));

-- Users with project access can create comments
CREATE POLICY "Users with project access can create comments"
ON public.project_comments
FOR INSERT
WITH CHECK (
  has_project_access(auth.uid(), project_id)
  AND user_id = auth.uid()
);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.project_comments
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own comments or admins can delete any
CREATE POLICY "Users can delete their own comments"
ON public.project_comments
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_comments.project_id
    AND (is_company_admin(auth.uid(), p.company_id) OR is_company_owner(auth.uid(), p.company_id))
  )
);

-- Enable realtime for project_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;

-- Add index for faster queries
CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_project_comments_created_at ON public.project_comments(created_at DESC);