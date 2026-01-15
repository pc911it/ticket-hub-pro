-- Create RFIs table
CREATE TABLE public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_number VARCHAR NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  drawing_reference TEXT,
  spec_reference TEXT,
  priority VARCHAR DEFAULT 'medium',
  status VARCHAR NOT NULL DEFAULT 'draft',
  due_date TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  under_review_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  response TEXT,
  response_by UUID REFERENCES auth.users(id),
  response_at TIMESTAMP WITH TIME ZONE,
  approval_status VARCHAR DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  partner_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  partner_submitted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RFI attachments table
CREATE TABLE public.rfi_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR,
  file_size INTEGER,
  category VARCHAR DEFAULT 'document',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RFI activity log table
CREATE TABLE public.rfi_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RFI comments table for discussion thread
CREATE TABLE public.rfi_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_comments ENABLE ROW LEVEL SECURITY;

-- RFI policies
CREATE POLICY "Users can view RFIs in their company" ON public.rfis
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR 
    company_id IN (SELECT get_user_company_ids(auth.uid())) OR
    partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
  );

CREATE POLICY "Users can create RFIs in their company" ON public.rfis
  FOR INSERT WITH CHECK (
    is_super_admin(auth.uid()) OR 
    company_id IN (SELECT get_user_company_ids(auth.uid())) OR
    partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
  );

CREATE POLICY "Users can update RFIs in their company" ON public.rfis
  FOR UPDATE USING (
    is_super_admin(auth.uid()) OR 
    company_id IN (SELECT get_user_company_ids(auth.uid())) OR
    partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
  );

CREATE POLICY "Admins can delete RFIs" ON public.rfis
  FOR DELETE USING (
    is_super_admin(auth.uid()) OR 
    is_company_admin(auth.uid(), company_id)
  );

-- RFI attachments policies
CREATE POLICY "Users can view RFI attachments" ON public.rfi_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        r.partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

CREATE POLICY "Users can manage RFI attachments" ON public.rfi_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        r.partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

-- RFI activity log policies
CREATE POLICY "Users can view RFI activity" ON public.rfi_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        r.partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

CREATE POLICY "Users can create RFI activity" ON public.rfi_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        r.partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

-- RFI comments policies
CREATE POLICY "Users can view RFI comments" ON public.rfi_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        (r.partner_company_id IN (SELECT get_user_company_ids(auth.uid())) AND is_internal = false)
      )
    )
  );

CREATE POLICY "Users can create RFI comments" ON public.rfi_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM rfis r WHERE r.id = rfi_id AND (
        is_super_admin(auth.uid()) OR 
        r.company_id IN (SELECT get_user_company_ids(auth.uid())) OR
        r.partner_company_id IN (SELECT get_user_company_ids(auth.uid()))
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON public.rfi_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.rfi_comments
  FOR DELETE USING (user_id = auth.uid());

-- Create storage bucket for RFI attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rfi-attachments', 'rfi-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for RFI attachments
CREATE POLICY "Authenticated users can upload RFI attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'rfi-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view RFI attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'rfi-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete RFI attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'rfi-attachments' AND auth.uid() IS NOT NULL);

-- Update trigger
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfi_comments_updated_at
  BEFORE UPDATE ON public.rfi_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();