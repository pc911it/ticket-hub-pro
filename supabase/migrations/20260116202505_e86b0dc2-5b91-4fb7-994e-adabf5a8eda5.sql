-- Create company_feature_overrides table for per-company feature customization
CREATE TABLE IF NOT EXISTS public.company_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.company_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage feature overrides
CREATE POLICY "Super admins can view all feature overrides"
  ON public.company_feature_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert feature overrides"
  ON public.company_feature_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update feature overrides"
  ON public.company_feature_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete feature overrides"
  ON public.company_feature_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_company_feature_overrides_updated_at
  BEFORE UPDATE ON public.company_feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();