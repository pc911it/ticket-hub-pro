import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePromoCodes, PromoValidationResult } from '@/hooks/usePromoCodes';
import { Tag, Check, X, Loader2 } from 'lucide-react';

interface PromoCodeInputProps {
  plan?: string;
  onPromoApplied: (result: PromoValidationResult) => void;
  disabled?: boolean;
}

export function PromoCodeInput({ plan, onPromoApplied, disabled }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [validationResult, setValidationResult] = useState<PromoValidationResult | null>(null);
  const { validatePromoCode, loading } = usePromoCodes();

  const handleApply = async () => {
    if (!code.trim()) return;
    
    const result = await validatePromoCode(code, plan);
    setValidationResult(result);
    
    if (result.valid) {
      onPromoApplied(result);
    }
  };

  const handleClear = () => {
    setCode('');
    setValidationResult(null);
    onPromoApplied({ valid: false, message: '' });
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Promo Code
      </Label>
      
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter promo code"
          className="uppercase"
          disabled={disabled || loading || (validationResult?.valid ?? false)}
        />
        
        {validationResult?.valid ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleApply}
            disabled={!code.trim() || loading || disabled}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </Button>
        )}
      </div>

      {validationResult && (
        <Alert variant={validationResult.valid ? 'default' : 'destructive'}>
          <div className="flex items-center gap-2">
            {validationResult.valid ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <AlertDescription>{validationResult.message}</AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
