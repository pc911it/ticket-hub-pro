-- Remove all starter plan features (plan no longer exists)
DELETE FROM plan_features WHERE plan_id = 'starter';

-- Add advanced plan features (between professional and enterprise)
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  -- Advanced plan - $899/month
  ('advanced', 'max_agents', true, 100),
  ('advanced', 'max_dispatchers', true, 30),
  ('advanced', 'max_tickets_monthly', true, NULL),
  ('advanced', 'project_management', true, NULL),
  ('advanced', 'billing_management', true, NULL),
  ('advanced', 'inventory_management', true, NULL),
  ('advanced', 'real_time_tracking', true, NULL),
  ('advanced', 'custom_reports', true, NULL),
  ('advanced', 'advanced_analytics', true, NULL),
  ('advanced', 'api_access', true, NULL),
  ('advanced', 'settings_access', true, NULL),
  ('advanced', 'priority_support', true, NULL),
  ('advanced', 'white_label', false, NULL);

-- Update professional plan features to match new tier ($349/month)
UPDATE plan_features SET limit_value = 25 WHERE plan_id = 'professional' AND feature_key = 'max_agents';
UPDATE plan_features SET limit_value = 10 WHERE plan_id = 'professional' AND feature_key = 'max_dispatchers';
UPDATE plan_features SET is_enabled = false WHERE plan_id = 'professional' AND feature_key = 'advanced_analytics';
UPDATE plan_features SET is_enabled = false WHERE plan_id = 'professional' AND feature_key = 'api_access';

-- Add missing features to professional plan
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  ('professional', 'priority_support', false, NULL),
  ('professional', 'white_label', false, NULL);

-- Add missing features to enterprise plan
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
  ('enterprise', 'priority_support', true, NULL),
  ('enterprise', 'white_label', true, NULL);