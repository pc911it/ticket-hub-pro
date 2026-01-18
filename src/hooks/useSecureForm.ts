import { useState, useCallback } from 'react';
import { z } from 'zod';
import { 
  sanitizeHtml, 
  isRateLimited, 
  containsInjectionPatterns,
  emailSchema,
  phoneSchema,
  generalTextSchema 
} from '@/lib/securityUtils';
import { toast } from 'sonner';

interface UseSecureFormOptions {
  rateLimitKey?: string;
  maxSubmissions?: number;
  windowMs?: number;
  enableSanitization?: boolean;
}

interface SecureFormState {
  isSubmitting: boolean;
  isRateLimited: boolean;
  lastSubmissionTime: number | null;
}

/**
 * Hook for secure form handling with rate limiting, validation, and sanitization
 */
export function useSecureForm(options: UseSecureFormOptions = {}) {
  const {
    rateLimitKey = 'form_submission',
    maxSubmissions = 5,
    windowMs = 60000,
    enableSanitization = true
  } = options;

  const [state, setState] = useState<SecureFormState>({
    isSubmitting: false,
    isRateLimited: false,
    lastSubmissionTime: null
  });

  /**
   * Sanitize all string fields in an object
   */
  const sanitizeFormData = useCallback(<T extends Record<string, unknown>>(data: T): T => {
    if (!enableSanitization) return data;
    
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      const value = sanitized[key];
      if (typeof value === 'string') {
        // Check for injection patterns
        if (containsInjectionPatterns(value)) {
          console.warn(`Potential injection pattern detected in field: ${key}`);
          (sanitized as Record<string, unknown>)[key] = sanitizeHtml(value);
        } else {
          (sanitized as Record<string, unknown>)[key] = value.trim();
        }
      }
    }
    
    return sanitized;
  }, [enableSanitization]);

  /**
   * Check if form submission is rate limited
   */
  const checkRateLimit = useCallback((): boolean => {
    const limited = isRateLimited(rateLimitKey, maxSubmissions, windowMs);
    if (limited) {
      setState(prev => ({ ...prev, isRateLimited: true }));
      toast.error('Too many submissions. Please wait before trying again.');
      return true;
    }
    setState(prev => ({ ...prev, isRateLimited: false }));
    return false;
  }, [rateLimitKey, maxSubmissions, windowMs]);

  /**
   * Secure form submission wrapper
   */
  const secureSubmit = useCallback(async <T extends Record<string, unknown>>(
    data: T,
    schema: z.ZodSchema<T>,
    onSubmit: (validData: T) => Promise<void>
  ): Promise<boolean> => {
    // Check rate limit
    if (checkRateLimit()) {
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Sanitize data
      const sanitizedData = sanitizeFormData(data);
      
      // Validate with schema
      const result = schema.safeParse(sanitizedData);
      
      if (!result.success) {
        const errors = result.error.errors.map(e => e.message).join(', ');
        toast.error(`Validation error: ${errors}`);
        return false;
      }

      // Execute submission
      await onSubmit(result.data);
      
      setState(prev => ({ 
        ...prev, 
        lastSubmissionTime: Date.now() 
      }));
      
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('An error occurred. Please try again.');
      return false;
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [checkRateLimit, sanitizeFormData]);

  /**
   * Validate a single field
   */
  const validateField = useCallback(<T>(
    value: unknown,
    schema: z.ZodSchema<T>
  ): { valid: boolean; error?: string; value?: T } => {
    const result = schema.safeParse(value);
    if (result.success) {
      return { valid: true, value: result.data };
    }
    return { 
      valid: false, 
      error: result.error.errors[0]?.message || 'Invalid value' 
    };
  }, []);

  /**
   * Common field validators
   */
  const validators = {
    email: (value: string) => validateField(value, emailSchema),
    phone: (value: string) => validateField(value, phoneSchema),
    text: (value: string) => validateField(value, generalTextSchema),
    required: (value: string) => {
      const trimmed = value?.trim();
      return {
        valid: !!trimmed,
        error: trimmed ? undefined : 'This field is required',
        value: trimmed
      };
    }
  };

  return {
    ...state,
    sanitizeFormData,
    checkRateLimit,
    secureSubmit,
    validateField,
    validators
  };
}

/**
 * Common form validation schemas
 */
export const formSchemas = {
  contact: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: emailSchema,
    phone: phoneSchema.optional(),
    message: z.string().trim().min(1, 'Message is required').max(2000)
  }),
  
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
  }),
  
  client: z.object({
    full_name: z.string().trim().min(1, 'Name is required').max(100),
    email: emailSchema,
    phone: phoneSchema.optional(),
    address: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(2000).optional()
  }),
  
  lead: z.object({
    full_name: z.string().trim().min(1, 'Name is required').max(100),
    email: emailSchema.optional().or(z.literal('')),
    phone: phoneSchema.optional(),
    source: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(2000).optional()
  }),
  
  project: z.object({
    name: z.string().trim().min(1, 'Project name is required').max(200),
    description: z.string().trim().max(5000).optional(),
    address: z.string().trim().max(500).optional(),
    budget: z.number().min(0).max(999999999).optional()
  }),
  
  ticket: z.object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
  }),
  
  invoice: z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0').max(999999999),
    description: z.string().trim().max(1000).optional(),
    due_date: z.string().min(1, 'Due date is required')
  })
};
