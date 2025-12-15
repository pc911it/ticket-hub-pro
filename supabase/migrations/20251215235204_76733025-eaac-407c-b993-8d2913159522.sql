-- Create client payment plans table
CREATE TABLE public.client_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, one_time
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client subscriptions table
CREATE TABLE public.client_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payment_plan_id UUID NOT NULL REFERENCES public.client_payment_plans(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, paused, payment_failed
  square_customer_id TEXT,
  square_card_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'invoice', -- invoice, card_on_file
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client invoices table
CREATE TABLE public.client_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT, -- invoice, card_on_file
  square_payment_id TEXT,
  description TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client payments table for tracking all payments
CREATE TABLE public.client_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
  payment_method TEXT NOT NULL, -- card, invoice_payment
  square_payment_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_payment_plans
CREATE POLICY "Require auth for client_payment_plans" ON public.client_payment_plans
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view payment plans" ON public.client_payment_plans
  FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Company admins can manage payment plans" ON public.client_payment_plans
  FOR ALL USING (
    is_company_admin(auth.uid(), company_id) OR 
    is_company_owner(auth.uid(), company_id) OR 
    is_super_admin(auth.uid())
  );

-- RLS Policies for client_subscriptions
CREATE POLICY "Require auth for client_subscriptions" ON public.client_subscriptions
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view subscriptions" ON public.client_subscriptions
  FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Staff and admins can manage subscriptions" ON public.client_subscriptions
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'staff') OR
    is_company_admin(auth.uid(), company_id) OR 
    is_company_owner(auth.uid(), company_id)
  );

CREATE POLICY "Clients can view their own subscriptions" ON public.client_subscriptions
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN profiles p ON p.email = c.email
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS Policies for client_invoices
CREATE POLICY "Require auth for client_invoices" ON public.client_invoices
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view invoices" ON public.client_invoices
  FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Staff and admins can manage invoices" ON public.client_invoices
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'staff') OR
    is_company_admin(auth.uid(), company_id) OR 
    is_company_owner(auth.uid(), company_id)
  );

CREATE POLICY "Clients can view their own invoices" ON public.client_invoices
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN profiles p ON p.email = c.email
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS Policies for client_payments
CREATE POLICY "Require auth for client_payments" ON public.client_payments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view payments" ON public.client_payments
  FOR SELECT USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Staff and admins can manage payments" ON public.client_payments
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'staff') OR
    is_company_admin(auth.uid(), company_id) OR 
    is_company_owner(auth.uid(), company_id)
  );

CREATE POLICY "Clients can view their own payments" ON public.client_payments
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN profiles p ON p.email = c.email
      WHERE p.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_client_payment_plans_updated_at
  BEFORE UPDATE ON public.client_payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_invoices_updated_at
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();