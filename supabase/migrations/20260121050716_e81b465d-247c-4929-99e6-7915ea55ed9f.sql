-- Create the PC911 IT GLOBAL company for Super Admin
INSERT INTO public.companies (
  name,
  email,
  type,
  approval_status,
  is_active,
  subscription_plan,
  subscription_status
) VALUES (
  'PC911 IT GLOBAL',
  'pc911itmiami@gmail.com',
  'other',
  'approved',
  true,
  'enterprise',
  'active'
) ON CONFLICT DO NOTHING;