-- Add missing features for Professional plan to match landing page
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  -- Professional specific limits
  ('professional', 'geolocation_verification', true, null),
  ('professional', 'admin_approval_workflow', true, null),
  ('professional', 'project_chat', true, null),
  ('professional', 'file_uploads', true, null),
  ('professional', 'client_portal', true, null)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Update leads limit for professional (100 leads)
UPDATE public.plan_features SET limit_value = 100 WHERE plan_id = 'professional' AND feature_key = 'leads_management';

-- Update max_agents limit for professional (10 staff)
UPDATE public.plan_features SET limit_value = 10 WHERE plan_id = 'professional' AND feature_key = 'max_agents';

-- Update max_tickets_monthly limit for professional (1000 tickets)
UPDATE public.plan_features SET limit_value = 1000 WHERE plan_id = 'professional' AND feature_key = 'max_tickets_monthly';

-- Add missing features for Advanced plan
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  ('advanced', 'geolocation_verification', true, null),
  ('advanced', 'admin_approval_workflow', true, null),
  ('advanced', 'project_chat', true, null),
  ('advanced', 'file_uploads', true, null),
  ('advanced', 'client_portal', true, null),
  ('advanced', 'inventory_reports', true, null)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Add missing features for Enterprise plan
INSERT INTO public.plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  ('enterprise', 'geolocation_verification', true, null),
  ('enterprise', 'admin_approval_workflow', true, null),
  ('enterprise', 'project_chat', true, null),
  ('enterprise', 'file_uploads', true, null),
  ('enterprise', 'client_portal', true, null),
  ('enterprise', 'inventory_reports', true, null),
  ('enterprise', 'multi_location_inventory', true, null),
  ('enterprise', 'ocr_scanned_drawings', true, null),
  ('enterprise', 'version_control', true, null),
  ('enterprise', 'studio_collaboration', true, null),
  ('enterprise', 'custom_integrations', true, null),
  ('enterprise', 'dedicated_account_manager', true, null),
  ('enterprise', 'custom_training', true, null)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Enable white_label for Advanced plan (it was showing false)
UPDATE public.plan_features SET is_enabled = true WHERE plan_id = 'advanced' AND feature_key = 'white_label';