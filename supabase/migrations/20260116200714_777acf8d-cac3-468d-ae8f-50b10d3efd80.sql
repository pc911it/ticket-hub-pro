-- =====================================================
-- ADVANCED FEATURES SCHEMA
-- =====================================================

-- 1. PRODUCT LIBRARIES / CATALOGS
-- =====================================================
CREATE TABLE public.product_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- flooring, fixtures, appliances, cabinets, etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  manufacturer TEXT,
  unit_price NUMERIC(12,2),
  unit TEXT,
  specifications JSONB,
  image_url TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MOOD BOARDS
-- =====================================================
CREATE TABLE public.mood_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, shared, approved
  shared_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mood_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_board_id UUID NOT NULL REFERENCES public.mood_boards(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- image, product, color, text, note
  title TEXT,
  description TEXT,
  image_url TEXT,
  product_id UUID REFERENCES public.product_items(id),
  color_hex TEXT,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 200,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SUBCONTRACTORS / TRADE PARTNERS
-- =====================================================
CREATE TABLE public.subcontractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  trades TEXT[], -- plumbing, electrical, hvac, framing, etc.
  license_number TEXT,
  license_expiry DATE,
  insurance_expiry DATE,
  w9_on_file BOOLEAN DEFAULT false,
  coi_on_file BOOLEAN DEFAULT false,
  rating NUMERIC(3,2), -- 1.00 to 5.00
  total_projects INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, inactive, blacklisted
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subcontractor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_of_work TEXT,
  contract_amount NUMERIC(14,2),
  status TEXT DEFAULT 'pending', -- pending, approved, in_progress, completed
  start_date DATE,
  end_date DATE,
  completion_percent INTEGER DEFAULT 0,
  performance_rating NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LABOR & MATERIAL COST TEMPLATES
-- =====================================================
CREATE TABLE public.cost_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- labor, material, equipment
  description TEXT,
  unit TEXT NOT NULL, -- hour, sqft, linear_ft, each, etc.
  unit_cost NUMERIC(12,4) NOT NULL,
  labor_hours_per_unit NUMERIC(8,4),
  crew_size INTEGER,
  productivity_rate NUMERIC(8,4),
  markup_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SITE LOCATIONS / GPS MAPPING
-- =====================================================
CREATE TABLE public.site_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  name TEXT NOT NULL,
  location_type TEXT, -- staging_area, material_storage, entrance, parking, work_zone
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  address TEXT,
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PLAN MARKUPS / ANNOTATIONS
-- =====================================================
CREATE TABLE public.plan_markups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  floor_plan_id UUID REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  markup_type TEXT NOT NULL, -- text, arrow, rectangle, circle, freehand, pin, measurement
  page_number INTEGER DEFAULT 1,
  position_x NUMERIC(10,4),
  position_y NUMERIC(10,4),
  width NUMERIC(10,4),
  height NUMERIC(10,4),
  rotation NUMERIC(6,2) DEFAULT 0,
  content TEXT,
  color TEXT DEFAULT '#FF0000',
  stroke_width INTEGER DEFAULT 2,
  font_size INTEGER DEFAULT 14,
  points JSONB, -- for freehand drawings
  linked_punch_item_id UUID REFERENCES public.punch_list_items(id),
  linked_rfi_id UUID REFERENCES public.rfis(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. AI BIDDING / TAKEOFFS
-- =====================================================
CREATE TABLE public.ai_takeoff_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  floor_plan_id UUID REFERENCES public.floor_plans(id),
  document_url TEXT,
  document_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  ai_model_used TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_takeoff_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_takeoff_sessions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- wall, window, door, room, fixture, etc.
  label TEXT,
  quantity NUMERIC(12,4),
  unit TEXT,
  dimensions JSONB, -- length, width, height, area
  location_on_plan JSONB, -- bounding box coordinates
  confidence_score NUMERIC(5,4), -- 0.0000 to 1.0000
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. HOMEOWNER FOLLOW-UPS / REMINDERS
-- =====================================================
CREATE TABLE public.follow_up_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  lead_id UUID REFERENCES public.leads(id),
  warranty_id UUID REFERENCES public.warranties(id),
  reminder_type TEXT NOT NULL, -- follow_up, warranty_check, satisfaction_survey, anniversary
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, snoozed, cancelled
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  snoozed_until DATE,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. OFFLINE SYNC QUEUE
-- =====================================================
CREATE TABLE public.offline_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- daily_log, punch_item, photo, etc.
  entity_id UUID,
  action TEXT NOT NULL, -- create, update, delete
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, synced, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_takeoff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_takeoff_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Product Catalogs
CREATE POLICY "Users can view product catalogs for their company"
  ON public.product_catalogs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage product catalogs for their company"
  ON public.product_catalogs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Product Items
CREATE POLICY "Users can view product items for their company"
  ON public.product_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage product items for their company"
  ON public.product_items FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Mood Boards
CREATE POLICY "Users can view mood boards for their company"
  ON public.mood_boards FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage mood boards for their company"
  ON public.mood_boards FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Mood Board Items
CREATE POLICY "Users can view mood board items"
  ON public.mood_board_items FOR SELECT
  USING (mood_board_id IN (SELECT id FROM public.mood_boards WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage mood board items"
  ON public.mood_board_items FOR ALL
  USING (mood_board_id IN (SELECT id FROM public.mood_boards WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Subcontractors
CREATE POLICY "Users can view subcontractors for their company"
  ON public.subcontractors FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage subcontractors for their company"
  ON public.subcontractors FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Subcontractor Assignments
CREATE POLICY "Users can view subcontractor assignments for their company"
  ON public.subcontractor_assignments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage subcontractor assignments for their company"
  ON public.subcontractor_assignments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Cost Templates
CREATE POLICY "Users can view cost templates for their company"
  ON public.cost_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage cost templates for their company"
  ON public.cost_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Site Locations
CREATE POLICY "Users can view site locations for their company"
  ON public.site_locations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage site locations for their company"
  ON public.site_locations FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Plan Markups
CREATE POLICY "Users can view plan markups for their company"
  ON public.plan_markups FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage plan markups for their company"
  ON public.plan_markups FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- AI Takeoff Sessions
CREATE POLICY "Users can view AI takeoff sessions for their company"
  ON public.ai_takeoff_sessions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage AI takeoff sessions for their company"
  ON public.ai_takeoff_sessions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- AI Takeoff Items
CREATE POLICY "Users can view AI takeoff items"
  ON public.ai_takeoff_items FOR SELECT
  USING (session_id IN (SELECT id FROM public.ai_takeoff_sessions WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage AI takeoff items"
  ON public.ai_takeoff_items FOR ALL
  USING (session_id IN (SELECT id FROM public.ai_takeoff_sessions WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Follow-up Reminders
CREATE POLICY "Users can view reminders for their company"
  ON public.follow_up_reminders FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage reminders for their company"
  ON public.follow_up_reminders FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Offline Sync Queue
CREATE POLICY "Users can view their own sync queue"
  ON public.offline_sync_queue FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sync queue"
  ON public.offline_sync_queue FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_product_catalogs_company ON public.product_catalogs(company_id);
CREATE INDEX idx_product_items_catalog ON public.product_items(catalog_id);
CREATE INDEX idx_mood_boards_project ON public.mood_boards(project_id);
CREATE INDEX idx_subcontractors_company ON public.subcontractors(company_id);
CREATE INDEX idx_subcontractors_trades ON public.subcontractors USING GIN(trades);
CREATE INDEX idx_cost_templates_company ON public.cost_templates(company_id);
CREATE INDEX idx_site_locations_project ON public.site_locations(project_id);
CREATE INDEX idx_plan_markups_floor_plan ON public.plan_markups(floor_plan_id);
CREATE INDEX idx_ai_takeoff_sessions_company ON public.ai_takeoff_sessions(company_id);
CREATE INDEX idx_follow_up_reminders_due ON public.follow_up_reminders(due_date, status);
CREATE INDEX idx_offline_sync_queue_status ON public.offline_sync_queue(status, user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_product_catalogs_updated_at BEFORE UPDATE ON public.product_catalogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_items_updated_at BEFORE UPDATE ON public.product_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mood_boards_updated_at BEFORE UPDATE ON public.mood_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON public.subcontractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subcontractor_assignments_updated_at BEFORE UPDATE ON public.subcontractor_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_templates_updated_at BEFORE UPDATE ON public.cost_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plan_markups_updated_at BEFORE UPDATE ON public.plan_markups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_follow_up_reminders_updated_at BEFORE UPDATE ON public.follow_up_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();