import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

interface PlanFeature {
  feature_key: string;
  is_enabled: boolean;
  limit_value: number | null;
}

interface UseFeatureAccessReturn {
  hasFeature: (featureKey: string) => boolean;
  getLimit: (featureKey: string) => number | null;
  companyPlan: string | null;
  isLoading: boolean;
  features: PlanFeature[];
  isTrialActive: boolean;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { user, isSuperAdmin } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrialActive, setIsTrialActive] = useState(false);

  useEffect(() => {
    const fetchPlanAndFeatures = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Super admins have access to everything
      if (isSuperAdmin) {
        setCompanyPlan('enterprise');
        setIsTrialActive(false);
        // Load all enterprise features
        const { data: featuresData } = await supabase
          .from('plan_features')
          .select('feature_key, is_enabled, limit_value')
          .eq('plan_id', 'enterprise');
        
        if (featuresData) {
          setFeatures(featuresData);
        }
        setIsLoading(false);
        return;
      }

      // Get company's subscription plan
      let companyId = effectiveCompanyId;
      
      if (!companyId) {
        // Try to get company from company_members
        const { data: memberData } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        companyId = memberData?.company_id || null;
      }

      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // Fetch company plan and trial status
      const { data: companyData } = await supabase
        .from('companies')
        .select('subscription_plan, subscription_status, trial_ends_at')
        .eq('id', companyId)
        .single();

      const plan = companyData?.subscription_plan || 'professional';
      setCompanyPlan(plan);

      // Check if trial is still active
      const now = new Date();
      const trialEndsAt = companyData?.trial_ends_at ? new Date(companyData.trial_ends_at) : null;
      const isInTrial = companyData?.subscription_status === 'trial' && trialEndsAt && trialEndsAt > now;
      setIsTrialActive(isInTrial);

      // During trial, load enterprise features (all features enabled)
      // After trial, load features for the selected plan
      const planToLoad = isInTrial ? 'enterprise' : plan;

      const { data: featuresData } = await supabase
        .from('plan_features')
        .select('feature_key, is_enabled, limit_value')
        .eq('plan_id', planToLoad);

      // Also fetch company-specific overrides
      const { data: overridesData } = await supabase
        .from('company_feature_overrides')
        .select('feature_key, is_enabled, limit_value')
        .eq('company_id', companyId);

      // Merge plan features with overrides (overrides take precedence)
      let mergedFeatures = featuresData || [];
      if (overridesData && overridesData.length > 0) {
        const overrideMap = new Map(overridesData.map(o => [o.feature_key, o]));
        mergedFeatures = mergedFeatures.map(f => {
          const override = overrideMap.get(f.feature_key);
          if (override) {
            return { ...f, is_enabled: override.is_enabled, limit_value: override.limit_value };
          }
          return f;
        });
        // Add any overrides that don't exist in plan features
        overridesData.forEach(o => {
          if (!mergedFeatures.find(f => f.feature_key === o.feature_key)) {
            mergedFeatures.push(o);
          }
        });
      }

      if (mergedFeatures) {
        setFeatures(mergedFeatures);
      }

      setIsLoading(false);
    };

    fetchPlanAndFeatures();
  }, [user, isSuperAdmin, effectiveCompanyId]);

  const hasFeature = (featureKey: string): boolean => {
    // Super admins always have access
    if (isSuperAdmin) return true;
    
    // If still loading, default to false for safety
    if (isLoading) return false;

    // During trial, all features are available
    if (isTrialActive) return true;

    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.is_enabled ?? false;
  };

  const getLimit = (featureKey: string): number | null => {
    // Super admins have unlimited
    if (isSuperAdmin) return null;

    // During trial, no limits (return null = unlimited)
    if (isTrialActive) return null;

    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.limit_value ?? null;
  };

  return {
    hasFeature,
    getLimit,
    companyPlan,
    isLoading,
    features,
    isTrialActive,
  };
}
