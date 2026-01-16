-- =====================================================
-- CONSTRUCTION MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- =====================================================

-- 1. LEADS / CRM MANAGER
-- =====================================================
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  source TEXT, -- website, referral, advertisement, etc.
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, proposal, won, lost
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  estimated_value NUMERIC(12,2),
  notes TEXT,
  assigned_to UUID, -- user_id of sales rep
  next_follow_up DATE,
  converted_to_client_id UUID REFERENCES public.clients(id),
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- call, email, meeting, note, status_change
  description TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CONTRACTS WITH ESIGNATURES
-- =====================================================
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contract_type TEXT, -- fixed_price, time_and_materials, cost_plus
  amount NUMERIC(12,2),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, viewed, signed, executed, expired, cancelled
  terms_and_conditions TEXT,
  scope_of_work TEXT,
  payment_terms TEXT,
  document_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  client_signature_url TEXT,
  client_signed_by TEXT,
  company_signature_url TEXT,
  company_signed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CHANGE ORDERS
-- =====================================================
CREATE TABLE public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  change_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT, -- client_request, design_change, unforeseen_conditions, code_compliance
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, rejected, completed
  original_amount NUMERIC(12,2),
  revised_amount NUMERIC(12,2),
  cost_impact NUMERIC(12,2) DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  requested_by TEXT,
  requested_date DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  client_approved_by TEXT,
  client_approved_at TIMESTAMPTZ,
  client_signature_url TEXT,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.change_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_order_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. DAILY LOGS
-- =====================================================
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  log_date DATE NOT NULL,
  weather_conditions TEXT, -- sunny, cloudy, rainy, snow, etc.
  temperature_high INTEGER,
  temperature_low INTEGER,
  work_performed TEXT,
  materials_used TEXT,
  equipment_used TEXT,
  safety_incidents TEXT,
  visitor_log TEXT,
  delays_issues TEXT,
  notes TEXT,
  crew_count INTEGER,
  hours_worked NUMERIC(5,2),
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, log_date)
);

CREATE TABLE public.daily_log_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_log_labor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  trade TEXT,
  hours_worked NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BUDGETING / JOB COSTING
-- =====================================================
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_budget NUMERIC(14,2) DEFAULT 0,
  contingency_percent NUMERIC(5,2) DEFAULT 10,
  labor_budget NUMERIC(14,2) DEFAULT 0,
  materials_budget NUMERIC(14,2) DEFAULT 0,
  equipment_budget NUMERIC(14,2) DEFAULT 0,
  subcontractor_budget NUMERIC(14,2) DEFAULT 0,
  overhead_budget NUMERIC(14,2) DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) DEFAULT 15,
  status TEXT DEFAULT 'draft', -- draft, approved, locked
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TABLE public.budget_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  cost_code TEXT,
  category TEXT NOT NULL, -- labor, materials, equipment, subcontractor, overhead, other
  description TEXT NOT NULL,
  estimated_quantity NUMERIC(10,2),
  unit TEXT,
  unit_cost NUMERIC(12,2),
  estimated_total NUMERIC(14,2),
  actual_total NUMERIC(14,2) DEFAULT 0,
  variance NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.job_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  budget_line_item_id UUID REFERENCES public.budget_line_items(id),
  cost_date DATE NOT NULL,
  category TEXT NOT NULL,
  cost_code TEXT,
  description TEXT NOT NULL,
  vendor_supplier TEXT,
  invoice_number TEXT,
  quantity NUMERIC(10,2),
  unit TEXT,
  unit_cost NUMERIC(12,2),
  total_cost NUMERIC(14,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- pending, paid
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WORK ORDERS
-- =====================================================
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  ticket_id UUID REFERENCES public.tickets(id),
  work_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT NOT NULL DEFAULT 'draft', -- draft, assigned, in_progress, completed, cancelled
  work_type TEXT, -- repair, installation, maintenance, inspection
  assigned_to UUID,
  scheduled_start DATE,
  scheduled_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  estimated_hours NUMERIC(5,2),
  actual_hours NUMERIC(5,2),
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  location_details TEXT,
  special_instructions TEXT,
  completed_by UUID,
  completed_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PUNCH LISTS
-- =====================================================
CREATE TABLE public.punch_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, completed
  due_date DATE,
  walkthrough_date DATE,
  created_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.punch_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  punch_list_id UUID NOT NULL REFERENCES public.punch_lists(id) ON DELETE CASCADE,
  item_number INTEGER,
  location TEXT,
  description TEXT NOT NULL,
  category TEXT, -- electrical, plumbing, hvac, finish, structural, etc.
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, completed, rejected
  assigned_to UUID,
  photo_url TEXT,
  notes TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INSPECTIONS
-- =====================================================
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  permit_id UUID REFERENCES public.permits(id),
  inspection_number TEXT NOT NULL,
  inspection_type TEXT NOT NULL, -- foundation, framing, electrical, plumbing, final, etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, passed, failed, cancelled
  scheduled_date DATE,
  scheduled_time TIME,
  completed_date DATE,
  inspector_name TEXT,
  inspector_company TEXT,
  result TEXT, -- passed, passed_with_conditions, failed
  result_notes TEXT,
  deficiencies TEXT,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inspection_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_passed BOOLEAN,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. WARRANTY TRACKING
-- =====================================================
CREATE TABLE public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  warranty_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  warranty_type TEXT, -- workmanship, materials, manufacturer, appliance
  coverage_details TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, claimed, void
  provider TEXT, -- company or manufacturer name
  contact_info TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID NOT NULL REFERENCES public.warranties(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  claim_date DATE NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, under_review, approved, denied, completed
  resolution TEXT,
  cost NUMERIC(12,2),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. EQUIPMENT & VEHICLE TRACKING
-- =====================================================
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT, -- vehicle, heavy_equipment, tool, machinery
  make TEXT,
  model TEXT,
  year INTEGER,
  serial_number TEXT,
  license_plate TEXT,
  vin TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- available, in_use, maintenance, retired
  current_location TEXT,
  assigned_project_id UUID REFERENCES public.projects(id),
  assigned_to UUID,
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_value NUMERIC(12,2),
  next_service_date DATE,
  insurance_expiry DATE,
  registration_expiry DATE,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  log_type TEXT NOT NULL, -- usage, maintenance, fuel, incident, transfer
  log_date DATE NOT NULL,
  hours_used NUMERIC(6,2),
  mileage NUMERIC(10,2),
  fuel_gallons NUMERIC(8,2),
  fuel_cost NUMERIC(10,2),
  maintenance_type TEXT,
  maintenance_cost NUMERIC(10,2),
  description TEXT,
  operator_name TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. SELECTIONS & ALLOWANCES
-- =====================================================
CREATE TABLE public.selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  category TEXT NOT NULL, -- flooring, countertops, cabinets, fixtures, appliances, etc.
  item_name TEXT NOT NULL,
  description TEXT,
  allowance_amount NUMERIC(12,2), -- budgeted amount
  selected_amount NUMERIC(12,2), -- actual selection cost
  variance NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, selected, ordered, installed
  vendor TEXT,
  product_details TEXT,
  due_date DATE,
  selected_at TIMESTAMPTZ,
  ordered_at TIMESTAMPTZ,
  photo_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. AUDIT TRAILS
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  entity_type TEXT NOT NULL, -- project, invoice, contract, change_order, etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- create, update, delete, view, approve, reject
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL NEW TABLES
-- =====================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - LEADS
-- =====================================================
CREATE POLICY "Users can view leads for their company"
  ON public.leads FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create leads for their company"
  ON public.leads FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update leads for their company"
  ON public.leads FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete leads for their company"
  ON public.leads FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Lead Activities
CREATE POLICY "Users can view lead activities for their company leads"
  ON public.lead_activities FOR SELECT
  USING (lead_id IN (SELECT id FROM public.leads WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can create lead activities"
  ON public.lead_activities FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM public.leads WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - CONTRACTS
-- =====================================================
CREATE POLICY "Users can view contracts for their company"
  ON public.contracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create contracts for their company"
  ON public.contracts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update contracts for their company"
  ON public.contracts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete contracts for their company"
  ON public.contracts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - CHANGE ORDERS
-- =====================================================
CREATE POLICY "Users can view change orders for their company"
  ON public.change_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create change orders for their company"
  ON public.change_orders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update change orders for their company"
  ON public.change_orders FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete change orders for their company"
  ON public.change_orders FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Change Order Items
CREATE POLICY "Users can view change order items"
  ON public.change_order_items FOR SELECT
  USING (change_order_id IN (SELECT id FROM public.change_orders WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage change order items"
  ON public.change_order_items FOR ALL
  USING (change_order_id IN (SELECT id FROM public.change_orders WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - DAILY LOGS
-- =====================================================
CREATE POLICY "Users can view daily logs for their company"
  ON public.daily_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create daily logs for their company"
  ON public.daily_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update daily logs for their company"
  ON public.daily_logs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete daily logs for their company"
  ON public.daily_logs FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Daily Log Photos
CREATE POLICY "Users can view daily log photos"
  ON public.daily_log_photos FOR SELECT
  USING (daily_log_id IN (SELECT id FROM public.daily_logs WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage daily log photos"
  ON public.daily_log_photos FOR ALL
  USING (daily_log_id IN (SELECT id FROM public.daily_logs WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Daily Log Labor
CREATE POLICY "Users can view daily log labor"
  ON public.daily_log_labor FOR SELECT
  USING (daily_log_id IN (SELECT id FROM public.daily_logs WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage daily log labor"
  ON public.daily_log_labor FOR ALL
  USING (daily_log_id IN (SELECT id FROM public.daily_logs WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - BUDGETING
-- =====================================================
CREATE POLICY "Users can view budgets for their company"
  ON public.project_budgets FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create budgets for their company"
  ON public.project_budgets FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update budgets for their company"
  ON public.project_budgets FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete budgets for their company"
  ON public.project_budgets FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Budget Line Items
CREATE POLICY "Users can view budget line items"
  ON public.budget_line_items FOR SELECT
  USING (budget_id IN (SELECT id FROM public.project_budgets WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage budget line items"
  ON public.budget_line_items FOR ALL
  USING (budget_id IN (SELECT id FROM public.project_budgets WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- Job Costs
CREATE POLICY "Users can view job costs for their company"
  ON public.job_costs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create job costs for their company"
  ON public.job_costs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update job costs for their company"
  ON public.job_costs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete job costs for their company"
  ON public.job_costs FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - WORK ORDERS
-- =====================================================
CREATE POLICY "Users can view work orders for their company"
  ON public.work_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create work orders for their company"
  ON public.work_orders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update work orders for their company"
  ON public.work_orders FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete work orders for their company"
  ON public.work_orders FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - PUNCH LISTS
-- =====================================================
CREATE POLICY "Users can view punch lists for their company"
  ON public.punch_lists FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create punch lists for their company"
  ON public.punch_lists FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update punch lists for their company"
  ON public.punch_lists FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete punch lists for their company"
  ON public.punch_lists FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Punch List Items
CREATE POLICY "Users can view punch list items"
  ON public.punch_list_items FOR SELECT
  USING (punch_list_id IN (SELECT id FROM public.punch_lists WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage punch list items"
  ON public.punch_list_items FOR ALL
  USING (punch_list_id IN (SELECT id FROM public.punch_lists WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - INSPECTIONS
-- =====================================================
CREATE POLICY "Users can view inspections for their company"
  ON public.inspections FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create inspections for their company"
  ON public.inspections FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update inspections for their company"
  ON public.inspections FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete inspections for their company"
  ON public.inspections FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Inspection Checklists
CREATE POLICY "Users can view inspection checklists"
  ON public.inspection_checklists FOR SELECT
  USING (inspection_id IN (SELECT id FROM public.inspections WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage inspection checklists"
  ON public.inspection_checklists FOR ALL
  USING (inspection_id IN (SELECT id FROM public.inspections WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - WARRANTIES
-- =====================================================
CREATE POLICY "Users can view warranties for their company"
  ON public.warranties FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create warranties for their company"
  ON public.warranties FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update warranties for their company"
  ON public.warranties FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete warranties for their company"
  ON public.warranties FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Warranty Claims
CREATE POLICY "Users can view warranty claims"
  ON public.warranty_claims FOR SELECT
  USING (warranty_id IN (SELECT id FROM public.warranties WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage warranty claims"
  ON public.warranty_claims FOR ALL
  USING (warranty_id IN (SELECT id FROM public.warranties WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - EQUIPMENT
-- =====================================================
CREATE POLICY "Users can view equipment for their company"
  ON public.equipment FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create equipment for their company"
  ON public.equipment FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update equipment for their company"
  ON public.equipment FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete equipment for their company"
  ON public.equipment FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Equipment Logs
CREATE POLICY "Users can view equipment logs"
  ON public.equipment_logs FOR SELECT
  USING (equipment_id IN (SELECT id FROM public.equipment WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage equipment logs"
  ON public.equipment_logs FOR ALL
  USING (equipment_id IN (SELECT id FROM public.equipment WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())));

-- =====================================================
-- RLS POLICIES - SELECTIONS
-- =====================================================
CREATE POLICY "Users can view selections for their company"
  ON public.selections FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create selections for their company"
  ON public.selections FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update selections for their company"
  ON public.selections FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete selections for their company"
  ON public.selections FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - AUDIT LOGS
-- =====================================================
CREATE POLICY "Users can view audit logs for their company"
  ON public.audit_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_change_orders_company_id ON public.change_orders(company_id);
CREATE INDEX idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX idx_daily_logs_company_id ON public.daily_logs(company_id);
CREATE INDEX idx_daily_logs_project_id ON public.daily_logs(project_id);
CREATE INDEX idx_daily_logs_log_date ON public.daily_logs(log_date);
CREATE INDEX idx_project_budgets_project_id ON public.project_budgets(project_id);
CREATE INDEX idx_job_costs_project_id ON public.job_costs(project_id);
CREATE INDEX idx_work_orders_company_id ON public.work_orders(company_id);
CREATE INDEX idx_work_orders_project_id ON public.work_orders(project_id);
CREATE INDEX idx_punch_lists_project_id ON public.punch_lists(project_id);
CREATE INDEX idx_inspections_project_id ON public.inspections(project_id);
CREATE INDEX idx_warranties_company_id ON public.warranties(company_id);
CREATE INDEX idx_equipment_company_id ON public.equipment(company_id);
CREATE INDEX idx_selections_project_id ON public.selections(project_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- =====================================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all new tables with updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_line_items_updated_at BEFORE UPDATE ON public.budget_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_punch_lists_updated_at BEFORE UPDATE ON public.punch_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_punch_list_items_updated_at BEFORE UPDATE ON public.punch_list_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranties_updated_at BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranty_claims_updated_at BEFORE UPDATE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_selections_updated_at BEFORE UPDATE ON public.selections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ADD NEW FEATURE FLAGS TO PLAN_FEATURES
-- =====================================================
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
-- Professional Plan - Basic features
('professional', 'leads_management', true, 100),
('professional', 'daily_logs', true, NULL),
('professional', 'work_orders', true, NULL),
('professional', 'punch_lists', true, NULL),
('professional', 'basic_budgeting', true, NULL),

-- Advanced Plan - More features
('advanced', 'leads_management', true, 500),
('advanced', 'contracts_esign', true, NULL),
('advanced', 'change_orders', true, NULL),
('advanced', 'daily_logs', true, NULL),
('advanced', 'work_orders', true, NULL),
('advanced', 'punch_lists', true, NULL),
('advanced', 'inspections', true, NULL),
('advanced', 'warranties', true, NULL),
('advanced', 'equipment_tracking', true, NULL),
('advanced', 'selections_allowances', true, NULL),
('advanced', 'job_costing', true, NULL),
('advanced', 'basic_budgeting', true, NULL),

-- Enterprise Plan - All features unlimited
('enterprise', 'leads_management', true, NULL),
('enterprise', 'contracts_esign', true, NULL),
('enterprise', 'change_orders', true, NULL),
('enterprise', 'daily_logs', true, NULL),
('enterprise', 'work_orders', true, NULL),
('enterprise', 'punch_lists', true, NULL),
('enterprise', 'inspections', true, NULL),
('enterprise', 'warranties', true, NULL),
('enterprise', 'equipment_tracking', true, NULL),
('enterprise', 'selections_allowances', true, NULL),
('enterprise', 'job_costing', true, NULL),
('enterprise', 'advanced_budgeting', true, NULL),
('enterprise', 'audit_trails', true, NULL),
('enterprise', 'wip_reports', true, NULL),
('enterprise', 'gross_profit_analysis', true, NULL);
