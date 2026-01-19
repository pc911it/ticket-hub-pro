import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlanData {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  is_custom_pricing: boolean;
  is_popular: boolean;
  trial_days: number;
  sort_order: number;
}

export interface PricingSettingsData {
  yearly_discount_percent: number;
  default_trial_days: number;
  allow_monthly_billing: boolean;
  allow_yearly_billing: boolean;
}

// Default fallback plans if database fetch fails
const defaultPlans: SubscriptionPlanData[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Perfect for growing teams ready to scale operations',
    monthly_price: 34900,
    yearly_price: 299000,
    is_custom_pricing: false,
    is_popular: false,
    trial_days: 14,
    sort_order: 1,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Complete solution for high-volume organizations',
    monthly_price: 89900,
    yearly_price: 749000,
    is_custom_pricing: false,
    is_popular: true,
    trial_days: 14,
    sort_order: 2,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Tailored solutions for large-scale operations',
    monthly_price: 0,
    yearly_price: 0,
    is_custom_pricing: true,
    is_popular: false,
    trial_days: 14,
    sort_order: 3,
  },
];

const defaultSettings: PricingSettingsData = {
  yearly_discount_percent: 17,
  default_trial_days: 14,
  allow_monthly_billing: true,
  allow_yearly_billing: true,
};

export function useSubscriptionPlans() {
  // Use secure RPC function instead of direct table query
  const { data: plans = defaultPlans, isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['subscription-plans-public'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_subscription_plans');
      
      if (error) {
        console.warn('Failed to fetch subscription plans, using defaults:', error);
        return defaultPlans;
      }
      
      return (data as SubscriptionPlanData[]) || defaultPlans;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Use secure RPC function - excludes payment processing fees
  const { data: settings = defaultSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['pricing-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_pricing_settings');
      
      if (error) {
        console.warn('Failed to fetch pricing settings, using defaults:', error);
        return defaultSettings;
      }
      
      // RPC returns array, get first item
      const result = Array.isArray(data) ? data[0] : data;
      return (result as PricingSettingsData) || defaultSettings;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Helper to get price for a plan (used in billing logic)
  const getPlanPrice = (planId: string, isYearly: boolean = false): number => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 0;
    
    // Prices are stored in cents
    return isYearly ? plan.yearly_price : plan.monthly_price;
  };

  // Helper to get price in dollars
  const getPlanPriceFormatted = (planId: string, isYearly: boolean = false): string => {
    const cents = getPlanPrice(planId, isYearly);
    return (cents / 100).toFixed(2);
  };

  return {
    plans,
    settings,
    isLoading: plansLoading || settingsLoading,
    error: plansError,
    getPlanPrice,
    getPlanPriceFormatted,
    defaultPlans,
    defaultSettings,
  };
}

// Export for edge functions or other backend use
export { defaultPlans, defaultSettings };
