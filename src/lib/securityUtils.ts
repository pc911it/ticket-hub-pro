import { z } from 'zod';

/**
 * Security utilities for input validation and sanitization
 */

// Common validation schemas
export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, { message: "Invalid phone number" })
  .optional()
  .or(z.literal(''));

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name must be less than 100 characters" })
  .regex(/^[a-zA-Z\s'-]+$/, { message: "Name contains invalid characters" });

export const generalTextSchema = z
  .string()
  .trim()
  .max(1000, { message: "Text must be less than 1000 characters" });

export const urlSchema = z
  .string()
  .trim()
  .url({ message: "Invalid URL" })
  .max(2048, { message: "URL must be less than 2048 characters" });

export const uuidSchema = z
  .string()
  .uuid({ message: "Invalid ID format" });

export const amountSchema = z
  .number()
  .min(0, { message: "Amount cannot be negative" })
  .max(999999999, { message: "Amount exceeds maximum allowed" });

/**
 * Sanitize HTML content to prevent XSS
 * Strips all HTML tags and encodes special characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize input for SQL-like operations
 * Note: Always use parameterized queries, this is a backup
 */
export function sanitizeForDatabase(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '');
}

/**
 * Validate and sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed_file';
  
  // Remove path traversal attempts
  const sanitized = fileName
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
  
  return sanitized || 'unnamed_file';
}

/**
 * Rate limiting helper for client-side
 * Returns true if action should be blocked
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true;
  }
  
  record.count++;
  return false;
}

/**
 * Clear rate limit for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) return '****';
  return data.substring(0, visibleChars) + '****' + data.substring(data.length - visibleChars);
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number, currency: string = 'USD'): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) return false;
  if (amount <= 0) return false;
  if (amount > 999999999) return false; // Max ~$10M
  
  // Currency-specific validations
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    // Amount should be in cents, max 2 decimal places when converted
    if (amount !== Math.floor(amount)) return false;
  }
  
  return true;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if string contains potential injection patterns
 */
export function containsInjectionPatterns(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
    /vbscript:/i,
    /expression\(/i,
    /url\(/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}
