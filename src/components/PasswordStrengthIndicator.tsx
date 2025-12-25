import { validatePassword, getStrengthColor, getStrengthWidth } from '@/lib/passwordValidation';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);
  
  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`capitalize font-medium ${
            validation.strength === 'weak' ? 'text-destructive' :
            validation.strength === 'fair' ? 'text-orange-500' :
            validation.strength === 'good' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {validation.strength}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getStrengthColor(validation.strength)} ${getStrengthWidth(validation.strength)}`}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1 text-xs">
          <RequirementItem 
            met={password.length >= 8} 
            text="At least 8 characters" 
          />
          <RequirementItem 
            met={/[A-Z]/.test(password)} 
            text="One uppercase letter (A-Z)" 
          />
          <RequirementItem 
            met={/[a-z]/.test(password)} 
            text="One lowercase letter (a-z)" 
          />
          <RequirementItem 
            met={/[0-9]/.test(password)} 
            text="One number (0-9)" 
          />
          <RequirementItem 
            met={/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/.test(password)} 
            text="One special character (!@#$%...)" 
          />
        </div>
      )}

      {/* Error Messages */}
      {validation.errors.length > 0 && !showRequirements && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
      {met ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {text}
    </div>
  );
}
