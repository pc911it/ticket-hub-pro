import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'trial_extension';
  discount_value: number;
  trial_extension_days: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  created_at: string;
  updated_at: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promoCode?: PromoCode;
  message: string;
  discountAmount?: number;
  trialExtensionDays?: number;
}

export function usePromoCodes() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validatePromoCode = async (
    code: string,
    plan?: string
  ): Promise<PromoValidationResult> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { valid: false, message: 'Invalid promo code' };
      }

      const promoCode = data as PromoCode;

      // Check validity period
      const now = new Date();
      if (new Date(promoCode.valid_from) > now) {
        return { valid: false, message: 'This promo code is not yet active' };
      }

      if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
        return { valid: false, message: 'This promo code has expired' };
      }

      // Check usage limit
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return { valid: false, message: 'This promo code has reached its usage limit' };
      }

      // Check plan applicability
      if (plan && !promoCode.applicable_plans.includes(plan)) {
        return { valid: false, message: 'This promo code is not valid for the selected plan' };
      }

      return {
        valid: true,
        promoCode,
        message: getPromoMessage(promoCode),
        discountAmount: promoCode.discount_type !== 'trial_extension' ? promoCode.discount_value : undefined,
        trialExtensionDays: promoCode.discount_type === 'trial_extension' ? promoCode.trial_extension_days : undefined,
      };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, message: 'Error validating promo code' };
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = async (
    companyId: string,
    promoCodeId: string,
    discountApplied?: number,
    trialExtendedDays?: number
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // Insert usage record
      const { error: insertError } = await supabase
        .from('company_promo_codes')
        .insert({
          company_id: companyId,
          promo_code_id: promoCodeId,
          discount_applied: discountApplied,
          trial_extended_days: trialExtendedDays,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: 'Already Applied',
            description: 'This promo code has already been applied to your account.',
            variant: 'destructive',
          });
        } else {
          throw insertError;
        }
        return false;
      }

      // Increment usage count
      await supabase
        .from('promo_codes')
        .update({ current_uses: (await supabase.from('promo_codes').select('current_uses').eq('id', promoCodeId).single()).data?.current_uses + 1 || 1 })
        .eq('id', promoCodeId);

      toast({
        title: 'Promo Code Applied!',
        description: 'Your discount has been applied successfully.',
      });

      return true;
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply promo code. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPromoMessage = (promoCode: PromoCode): string => {
    switch (promoCode.discount_type) {
      case 'percentage':
        return `${promoCode.discount_value}% off your subscription!`;
      case 'fixed':
        return `$${promoCode.discount_value} off your subscription!`;
      case 'trial_extension':
        return `${promoCode.trial_extension_days} extra days added to your trial!`;
      default:
        return 'Promo code applied!';
    }
  };

  return {
    validatePromoCode,
    applyPromoCode,
    loading,
  };
}
