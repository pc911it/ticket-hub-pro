-- Create table for employee clock-in/clock-out entries
CREATE TABLE public.time_clock_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Require authentication for time_clock_entries"
ON public.time_clock_entries FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Agents can view their own time entries"
ON public.time_clock_entries FOR SELECT
USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Agents can insert their own time entries"
ON public.time_clock_entries FOR INSERT
WITH CHECK (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

CREATE POLICY "Agents can update their own time entries"
ON public.time_clock_entries FOR UPDATE
USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- Create time report submissions table
CREATE TABLE public.time_report_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_ticket_minutes INTEGER DEFAULT 0,
  total_clock_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.time_report_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Require authentication for time_report_submissions"
ON public.time_report_submissions FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view time report submissions"
ON public.time_report_submissions FOR SELECT
USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Agents can submit their own time reports"
ON public.time_report_submissions FOR INSERT
WITH CHECK (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update time report submissions"
ON public.time_report_submissions FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  OR is_company_owner(auth.uid(), company_id)
  OR is_super_admin(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_time_clock_entries_updated_at
BEFORE UPDATE ON public.time_clock_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for time entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_clock_entries;