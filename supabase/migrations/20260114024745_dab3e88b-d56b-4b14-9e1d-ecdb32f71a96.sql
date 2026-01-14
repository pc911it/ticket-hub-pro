-- Create canned responses table
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  shortcut text,
  is_global boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on canned_responses
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for canned_responses
CREATE POLICY "Require auth for canned_responses" 
ON public.canned_responses 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view company or global canned responses" 
ON public.canned_responses 
FOR SELECT 
USING (
  is_global = true 
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Staff can manage canned responses" 
ON public.canned_responses 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR is_super_admin(auth.uid())
);

-- Create ticket queue/views table for saved filters
CREATE TABLE IF NOT EXISTS public.ticket_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  filters jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_views
ALTER TABLE public.ticket_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_views
CREATE POLICY "Require auth for ticket_views" 
ON public.ticket_views 
FOR ALL 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view company ticket views" 
ON public.ticket_views 
FOR SELECT 
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Staff can manage ticket views" 
ON public.ticket_views 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'staff'::app_role)
  OR is_super_admin(auth.uid())
);