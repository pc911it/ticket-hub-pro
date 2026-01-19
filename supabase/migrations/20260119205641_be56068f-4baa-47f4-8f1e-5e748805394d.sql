-- Add increment function for promo code usage (secure, server-side)
CREATE OR REPLACE FUNCTION public.increment_promo_usage(_promo_code_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = _promo_code_id;
END;
$$;