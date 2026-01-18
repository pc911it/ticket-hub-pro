-- Add advanced promo code features
ALTER TABLE public.promo_codes 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_category TEXT DEFAULT 'standard' CHECK (promo_category IN ('standard', 'referral', 'loyalty', 'seasonal', 'flash_sale', 'event')),
ADD COLUMN IF NOT EXISTS referral_bonus_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_bonus_type TEXT CHECK (referral_bonus_type IN ('percentage', 'fixed', 'trial_extension')),
ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS applies_to_renewals BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create referral codes table for tracking referrals
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id),
  owner_company_id UUID REFERENCES public.companies(id),
  promo_code_id UUID REFERENCES public.promo_codes(id),
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  referrer_bonus_amount NUMERIC DEFAULT 0,
  referred_bonus_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Super admins can manage all referral codes"
ON public.referral_codes FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes FOR SELECT
USING (owner_user_id = auth.uid());

-- RLS policies for referral_uses
CREATE POLICY "Super admins can manage all referral uses"
ON public.referral_uses FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Referral code owners can view their referral uses"
ON public.referral_uses FOR SELECT
USING (
  referral_code_id IN (
    SELECT id FROM public.referral_codes WHERE owner_user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON public.referral_uses(referral_code_id);