-- Create bids table
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  bid_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Deadline tracking
  submission_deadline TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  -- Internal approval workflow
  internal_approval_status VARCHAR(50) DEFAULT 'pending',
  internal_approved_by UUID,
  internal_approved_at TIMESTAMP WITH TIME ZONE,
  internal_rejection_reason TEXT,
  -- Client acceptance workflow
  client_approval_status VARCHAR(50) DEFAULT 'pending',
  client_approved_by UUID,
  client_approved_at TIMESTAMP WITH TIME ZONE,
  client_rejection_reason TEXT,
  client_signature_url TEXT,
  -- Conversion tracking
  converted_to_invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  won_at TIMESTAMP WITH TIME ZONE,
  lost_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bid line items table
CREATE TABLE public.bid_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bid attachments table
CREATE TABLE public.bid_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bid activity log table
CREATE TABLE public.bid_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bids
CREATE POLICY "Users can view bids in their company"
ON public.bids FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Users can create bids in their company"
ON public.bids FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) OR
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Users can update bids in their company"
ON public.bids FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);

CREATE POLICY "Admins can delete bids in their company"
ON public.bids FOR DELETE
USING (
  is_super_admin(auth.uid()) OR
  is_company_admin(auth.uid(), company_id)
);

-- RLS Policies for bid_line_items
CREATE POLICY "Users can view bid line items"
ON public.bid_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

CREATE POLICY "Users can manage bid line items"
ON public.bid_line_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

-- RLS Policies for bid_attachments
CREATE POLICY "Users can view bid attachments"
ON public.bid_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

CREATE POLICY "Users can manage bid attachments"
ON public.bid_attachments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

-- RLS Policies for bid_activity_log
CREATE POLICY "Users can view bid activity"
ON public.bid_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

CREATE POLICY "Users can create bid activity"
ON public.bid_activity_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.id = bid_id
    AND (is_super_admin(auth.uid()) OR b.company_id IN (SELECT get_user_company_ids(auth.uid())))
  )
);

-- Create storage bucket for bid attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('bid-attachments', 'bid-attachments', true);

-- Storage policies for bid attachments
CREATE POLICY "Users can view bid attachment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'bid-attachments');

CREATE POLICY "Authenticated users can upload bid attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bid-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their bid attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bid-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete bid attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'bid-attachments' AND auth.role() = 'authenticated');

-- Add updated_at trigger for bids
CREATE TRIGGER update_bids_updated_at
BEFORE UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_bids_company_id ON public.bids(company_id);
CREATE INDEX idx_bids_project_id ON public.bids(project_id);
CREATE INDEX idx_bids_client_id ON public.bids(client_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_bids_submission_deadline ON public.bids(submission_deadline);
CREATE INDEX idx_bid_line_items_bid_id ON public.bid_line_items(bid_id);
CREATE INDEX idx_bid_attachments_bid_id ON public.bid_attachments(bid_id);
CREATE INDEX idx_bid_activity_log_bid_id ON public.bid_activity_log(bid_id);