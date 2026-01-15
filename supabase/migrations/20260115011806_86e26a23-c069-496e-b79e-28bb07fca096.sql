-- =============================================
-- SUBMITTALS MANAGEMENT
-- =============================================

-- Submittals table
CREATE TABLE public.submittals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  spec_section TEXT,
  drawing_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  revision_number INTEGER DEFAULT 1,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  due_date DATE,
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submittal revisions table
CREATE TABLE public.submittal_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submittal_id UUID NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  changes_description TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submittal attachments table
CREATE TABLE public.submittal_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submittal_id UUID NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES public.submittal_revisions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'document',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submittal activity log
CREATE TABLE public.submittal_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submittal_id UUID NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3D FLOOR PLANS
-- =============================================

-- Floor plans table
CREATE TABLE public.floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  floor_number INTEGER,
  model_url TEXT,
  model_type TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PERMIT TRACKING
-- =============================================

-- Permits table
CREATE TABLE public.permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  permit_number TEXT NOT NULL,
  permit_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  issuing_authority TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  application_date DATE,
  approval_date DATE,
  issue_date DATE,
  expiration_date DATE,
  renewal_date DATE,
  fee_amount NUMERIC(10,2),
  fee_paid BOOLEAN DEFAULT false,
  conditions TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit documents table
CREATE TABLE public.permit_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit inspections table
CREATE TABLE public.permit_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled',
  inspector_name TEXT,
  result TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_inspections ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - SUBMITTALS
-- =============================================

CREATE POLICY "Users can view submittals for their company"
  ON public.submittals FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create submittals for their company"
  ON public.submittals FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can update submittals for their company"
  ON public.submittals FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete submittals for their company"
  ON public.submittals FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

-- Submittal revisions policies
CREATE POLICY "Users can view submittal revisions"
  ON public.submittal_revisions FOR SELECT
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create submittal revisions"
  ON public.submittal_revisions FOR INSERT
  WITH CHECK (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can update submittal revisions"
  ON public.submittal_revisions FOR UPDATE
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete submittal revisions"
  ON public.submittal_revisions FOR DELETE
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

-- Submittal attachments policies
CREATE POLICY "Users can view submittal attachments"
  ON public.submittal_attachments FOR SELECT
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create submittal attachments"
  ON public.submittal_attachments FOR INSERT
  WITH CHECK (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete submittal attachments"
  ON public.submittal_attachments FOR DELETE
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

-- Submittal activity log policies
CREATE POLICY "Users can view submittal activity"
  ON public.submittal_activity_log FOR SELECT
  USING (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create submittal activity"
  ON public.submittal_activity_log FOR INSERT
  WITH CHECK (submittal_id IN (SELECT id FROM public.submittals WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - FLOOR PLANS
-- =============================================

CREATE POLICY "Users can view floor plans for their company"
  ON public.floor_plans FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create floor plans for their company"
  ON public.floor_plans FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can update floor plans for their company"
  ON public.floor_plans FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete floor plans for their company"
  ON public.floor_plans FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - PERMITS
-- =============================================

CREATE POLICY "Users can view permits for their company"
  ON public.permits FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create permits for their company"
  ON public.permits FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can update permits for their company"
  ON public.permits FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete permits for their company"
  ON public.permits FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())) OR is_super_admin(auth.uid()));

-- Permit documents policies
CREATE POLICY "Users can view permit documents"
  ON public.permit_documents FOR SELECT
  USING (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create permit documents"
  ON public.permit_documents FOR INSERT
  WITH CHECK (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete permit documents"
  ON public.permit_documents FOR DELETE
  USING (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

-- Permit inspections policies
CREATE POLICY "Users can view permit inspections"
  ON public.permit_inspections FOR SELECT
  USING (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can create permit inspections"
  ON public.permit_inspections FOR INSERT
  WITH CHECK (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can update permit inspections"
  ON public.permit_inspections FOR UPDATE
  USING (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete permit inspections"
  ON public.permit_inspections FOR DELETE
  USING (permit_id IN (SELECT id FROM public.permits WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))) OR is_super_admin(auth.uid()));

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('submittal-attachments', 'submittal-attachments', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('permit-documents', 'permit-documents', true);

-- Storage policies for submittal attachments
CREATE POLICY "Anyone can view submittal attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submittal-attachments');

CREATE POLICY "Authenticated users can upload submittal attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submittal-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their submittal attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'submittal-attachments' AND auth.role() = 'authenticated');

-- Storage policies for floor plans
CREATE POLICY "Anyone can view floor plans"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'floor-plans');

CREATE POLICY "Authenticated users can upload floor plans"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'floor-plans' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their floor plans"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'floor-plans' AND auth.role() = 'authenticated');

-- Storage policies for permit documents
CREATE POLICY "Anyone can view permit documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'permit-documents');

CREATE POLICY "Authenticated users can upload permit documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'permit-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their permit documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'permit-documents' AND auth.role() = 'authenticated');

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_submittals_updated_at
  BEFORE UPDATE ON public.submittals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON public.permits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_inspections_updated_at
  BEFORE UPDATE ON public.permit_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();