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
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { user, isSuperAdmin } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlanAndFeatures = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Super admins have access to everything
      if (isSuperAdmin) {
        setCompanyPlan('enterprise');
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

      // Fetch company plan
      const { data: companyData } = await supabase
        .from('companies')
        .select('subscription_plan')
        .eq('id', companyId)
        .single();

      const plan = companyData?.subscription_plan || 'starter';
      setCompanyPlan(plan);

      // Fetch features for this plan
      const { data: featuresData } = await supabase
        .from('plan_features')
        .select('feature_key, is_enabled, limit_value')
        .eq('plan_id', plan);

      if (featuresData) {
        setFeatures(featuresData);
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

    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.is_enabled ?? false;
  };

  const getLimit = (featureKey: string): number | null => {
    // Super admins have unlimited
    if (isSuperAdmin) return null;

    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.limit_value ?? null;
  };

  return {
    hasFeature,
    getLimit,
    companyPlan,
    isLoading,
    features,
  };
}
