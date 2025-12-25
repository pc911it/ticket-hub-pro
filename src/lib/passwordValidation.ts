// Strong password validation utilities

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export const SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else {
    strengthScore += 1;
    if (password.length >= 12) strengthScore += 1;
    if (password.length >= 16) strengthScore += 1;
  }

  // Check for uppercase letters
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  } else if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  }

  // Check for lowercase letters
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  } else if (/[a-z]/.test(password)) {
    strengthScore += 1;
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  } else if (/[0-9]/.test(password)) {
    strengthScore += 1;
  }

  // Check for special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]/;
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !specialCharRegex.test(password)) {
    errors.push(`Password must contain at least one special character (${SPECIAL_CHARACTERS})`);
  } else if (specialCharRegex.test(password)) {
    strengthScore += 2;
  }

  // Check for common patterns (weak passwords)
  const commonPatterns = [
    /^12345/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /^letmein/i,
    /^welcome/i,
    /^admin/i,
    /^123456/,
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password is too common. Please choose a more unique password');
    strengthScore = Math.max(0, strengthScore - 2);
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (strengthScore <= 2) {
    strength = 'weak';
  } else if (strengthScore <= 4) {
    strength = 'fair';
  } else if (strengthScore <= 6) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak':
      return 'bg-destructive';
    case 'fair':
      return 'bg-orange-500';
    case 'good':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
  }
}

export function getStrengthWidth(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'weak':
      return 'w-1/4';
    case 'fair':
      return 'w-2/4';
    case 'good':
      return 'w-3/4';
    case 'strong':
      return 'w-full';
  }
}
