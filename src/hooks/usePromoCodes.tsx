import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isRateLimited } from '@/lib/securityUtils';

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
}

export interface PromoValidationResult {
  valid: boolean;
  message: string;
  promoCode?: PromoCode;
  discountAmount?: number;
  trialExtensionDays?: number;
}

// Rate limit key prefix for promo validation
const PROMO_RATE_LIMIT_KEY = 'promo_validation';
const MAX_ATTEMPTS = 5; // Max 5 attempts per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

export function usePromoCodes() {
  const [loading, setLoading] = useState(false);

  const validatePromoCode = async (
    code: string,
    plan?: string
  ): Promise<PromoValidationResult> => {
    try {
      setLoading(true);
      
      // Client-side rate limiting to prevent brute force
      const rateLimitKey = `${PROMO_RATE_LIMIT_KEY}_${code.toUpperCase().trim()}`;
      if (isRateLimited(rateLimitKey, MAX_ATTEMPTS, RATE_LIMIT_WINDOW)) {
        return { 
          valid: false, 
          message: 'Too many attempts. Please wait a minute before trying again.' 
        };
      }
      
      // Use secure RPC function instead of direct table query
      const { data, error } = await supabase.rpc('validate_promo_code', {
        _code: code.toUpperCase().trim(),
        _plan: plan || null
      });

      if (error) {
        console.error('Promo validation error:', error);
        return { valid: false, message: 'Unable to validate promo code' };
      }

      // RPC returns array with single result
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result || !result.is_valid) {
        return { 
          valid: false, 
          message: result?.error_message || 'Invalid promo code' 
        };
      }

      // Build the promo code object from validated result
      const discountType = result.discount_type as 'percentage' | 'fixed' | 'trial_extension';
      const promoCode: PromoCode = {
        id: result.promo_code_id,
        code: code.toUpperCase().trim(),
        name: '', // Not exposed for security
        description: null,
        discount_type: discountType,
        discount_value: result.discount_value || 0,
        trial_extension_days: result.trial_extension_days || 0,
        max_uses: null,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        valid_until: null,
        is_active: true,
        applicable_plans: plan ? [plan] : [],
      };

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

  const getPromoMessage = (promo: PromoCode): string => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}% discount applied!`;
      case 'fixed':
        return `$${(promo.discount_value / 100).toFixed(2)} discount applied!`;
      case 'trial_extension':
        return `${promo.trial_extension_days} extra trial days added!`;
      default:
        return 'Promo code applied!';
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

      // Record the promo code usage
      const { error: insertError } = await supabase
        .from('company_promo_codes')
        .insert({
          company_id: companyId,
          promo_code_id: promoCodeId,
          discount_applied: discountApplied,
          trial_extended_days: trialExtendedDays,
        });

      if (insertError) {
        // Check if already used
        if (insertError.code === '23505') {
          console.warn('Promo code already applied to this company');
          return false;
        }
        throw insertError;
      }

      // Increment usage count via edge function or RPC
      // This is handled server-side for security
      const { error: updateError } = await supabase.rpc('increment_promo_usage', {
        _promo_code_id: promoCodeId
      });

      if (updateError) {
        console.warn('Could not increment promo usage:', updateError);
        // Non-fatal - the promo was still applied
      }

      return true;
    } catch (error) {
      console.error('Error applying promo code:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    validatePromoCode,
    applyPromoCode,
    loading,
  };
}
