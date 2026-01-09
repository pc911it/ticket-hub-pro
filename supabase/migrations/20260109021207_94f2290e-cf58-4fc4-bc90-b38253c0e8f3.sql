-- Phase 1: Make client_id nullable in tickets table
ALTER TABLE public.tickets ALTER COLUMN client_id DROP NOT NULL;

-- Phase 3: Create plan_features table for feature gating
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  limit_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read plan features (public info)
CREATE POLICY "Plan features are publicly readable"
ON public.plan_features
FOR SELECT
USING (true);

-- Only super admins can modify plan features
CREATE POLICY "Only super admins can modify plan features"
ON public.plan_features
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Insert default plan features
-- Starter Plan
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
('starter', 'max_dispatchers', true, 5),
('starter', 'max_agents', true, 10),
('starter', 'max_tickets_monthly', true, 100),
('starter', 'inventory_management', false, NULL),
('starter', 'project_management', false, NULL),
('starter', 'real_time_tracking', false, NULL),
('starter', 'custom_reports', false, NULL),
('starter', 'api_access', false, NULL),
('starter', 'advanced_analytics', false, NULL),
('starter', 'billing_management', true, NULL),
('starter', 'settings_access', true, NULL);

-- Professional Plan
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
('professional', 'max_dispatchers', true, 15),
('professional', 'max_agents', true, 50),
('professional', 'max_tickets_monthly', true, NULL),
('professional', 'inventory_management', true, NULL),
('professional', 'project_management', true, NULL),
('professional', 'real_time_tracking', true, NULL),
('professional', 'custom_reports', true, NULL),
('professional', 'api_access', false, NULL),
('professional', 'advanced_analytics', false, NULL),
('professional', 'billing_management', true, NULL),
('professional', 'settings_access', true, NULL);

-- Enterprise Plan
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
('enterprise', 'max_dispatchers', true, NULL),
('enterprise', 'max_agents', true, NULL),
('enterprise', 'max_tickets_monthly', true, NULL),
('enterprise', 'inventory_management', true, NULL),
('enterprise', 'project_management', true, NULL),
('enterprise', 'real_time_tracking', true, NULL),
('enterprise', 'custom_reports', true, NULL),
('enterprise', 'api_access', true, NULL),
('enterprise', 'advanced_analytics', true, NULL),
('enterprise', 'billing_management', true, NULL),
('enterprise', 'settings_access', true, NULL);