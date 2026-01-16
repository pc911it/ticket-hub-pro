-- Add new features to plan_features for all plans
-- Professional plan features (basic tier)
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
-- Professional gets basic features
('professional', 'leads_management', true, 100),
('professional', 'basic_budgeting', true, NULL),
('professional', 'daily_logs', true, NULL),
('professional', 'work_orders', true, NULL),
('professional', 'warranties', true, NULL),
('professional', 'follow_ups', true, NULL),
-- Professional does NOT get these advanced features
('professional', 'punch_lists', false, NULL),
('professional', 'inspections', false, NULL),
('professional', 'contracts_esign', false, NULL),
('professional', 'change_orders', false, NULL),
('professional', 'equipment_tracking', false, NULL),
('professional', 'selections_allowances', false, NULL),
('professional', 'subcontractor_matching', false, NULL),
('professional', 'cost_estimating', false, NULL),
('professional', 'mood_boards', false, NULL),
('professional', 'product_library', false, NULL),
('professional', 'ai_bidding', false, NULL),
('professional', 'ai_takeoffs', false, NULL),
('professional', 'offline_mode', false, NULL),
('professional', 'plan_markups', false, NULL),
('professional', 'site_mapping', false, NULL),
('professional', 'crew_dispatch', false, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled, limit_value = EXCLUDED.limit_value;

-- Advanced plan features (mid tier - most features)
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
('advanced', 'subcontractor_matching', true, NULL),
('advanced', 'cost_estimating', true, NULL),
('advanced', 'mood_boards', true, NULL),
('advanced', 'product_library', true, NULL),
('advanced', 'follow_ups', true, NULL),
('advanced', 'ai_bidding', true, NULL),
('advanced', 'ai_takeoffs', true, NULL),
('advanced', 'offline_mode', true, NULL),
('advanced', 'plan_markups', true, NULL),
('advanced', 'site_mapping', true, NULL),
('advanced', 'crew_dispatch', true, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled, limit_value = EXCLUDED.limit_value;

-- Enterprise plan features (all features)
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value) VALUES
('enterprise', 'leads_management', true, NULL),
('enterprise', 'basic_budgeting', true, NULL),
('enterprise', 'job_costing', true, NULL),
('enterprise', 'daily_logs', true, NULL),
('enterprise', 'work_orders', true, NULL),
('enterprise', 'punch_lists', true, NULL),
('enterprise', 'inspections', true, NULL),
('enterprise', 'contracts_esign', true, NULL),
('enterprise', 'change_orders', true, NULL),
('enterprise', 'warranties', true, NULL),
('enterprise', 'equipment_tracking', true, NULL),
('enterprise', 'selections_allowances', true, NULL),
('enterprise', 'subcontractor_matching', true, NULL),
('enterprise', 'cost_estimating', true, NULL),
('enterprise', 'mood_boards', true, NULL),
('enterprise', 'product_library', true, NULL),
('enterprise', 'follow_ups', true, NULL),
('enterprise', 'ai_bidding', true, NULL),
('enterprise', 'ai_takeoffs', true, NULL),
('enterprise', 'offline_mode', true, NULL),
('enterprise', 'plan_markups', true, NULL),
('enterprise', 'site_mapping', true, NULL),
('enterprise', 'crew_dispatch', true, NULL),
('enterprise', 'multi_company', true, NULL),
('enterprise', 'sla_support', true, NULL),
('enterprise', 'dedicated_onboarding', true, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled, limit_value = EXCLUDED.limit_value;