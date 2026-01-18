import { supabase } from '@/integrations/supabase/client';

/**
 * Secure file storage utilities
 * These replace public URL access with signed URLs for private buckets
 */

// Default signed URL expiry in seconds (4 hours)
const DEFAULT_SIGNED_URL_EXPIRY = 14400;

/**
 * Upload a file and return the file path (not public URL)
 * Store this path in the database, not a URL
 */
export async function uploadFileSecurely(
  bucket: string,
  file: File,
  path?: string
): Promise<{ filePath: string | null; error: Error | null }> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path || `${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { filePath: null, error: uploadError };
    }

    return { filePath, error: null };
  } catch (err) {
    return {
      filePath: null,
      error: err instanceof Error ? err : new Error('Upload failed'),
    };
  }
}

/**
 * Get a signed URL for a file in a private bucket
 * Use this whenever displaying files to users
 */
export async function getSecureFileUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<string | null> {
  try {
    // Check if it's already a full URL (legacy data)
    if (filePath.startsWith('http')) {
      // Extract the path from the URL
      const extractedPath = extractPathFromUrl(filePath, bucket);
      if (!extractedPath) {
        // If we can't extract, return the original URL (may fail for private buckets)
        console.warn('Could not extract path from legacy URL:', filePath);
        return filePath;
      }
      filePath = extractedPath;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting secure URL:', err);
    return null;
  }
}

/**
 * Get a signed download URL
 */
export async function getSecureDownloadUrl(
  bucket: string,
  filePath: string,
  fileName?: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<string | null> {
  try {
    // Handle legacy full URLs
    if (filePath.startsWith('http')) {
      const extractedPath = extractPathFromUrl(filePath, bucket);
      if (!extractedPath) return filePath;
      filePath = extractedPath;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn, {
        download: fileName || filePath.split('/').pop() || 'download',
      });

    if (error) {
      console.error('Error creating signed download URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting download URL:', err);
    return null;
  }
}

/**
 * Extract file path from a full storage URL
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    // Pattern: /storage/v1/object/public/bucket-name/path/to/file
    const publicPattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
    const signedPattern = new RegExp(`/storage/v1/object/sign/${bucket}/(.+?)\\?`);
    
    let match = url.match(publicPattern);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    
    match = url.match(signedPattern);
    if (match) {
      return decodeURIComponent(match[1]);
    }

    // Try URL parsing
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucket}/`);
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1].split('?')[0]);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get multiple signed URLs at once (more efficient for lists)
 */
export async function getMultipleSecureUrls(
  bucket: string,
  filePaths: string[],
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  const promises = filePaths.map(async (path) => {
    const url = await getSecureFileUrl(bucket, path, expiresIn);
    if (url) {
      urlMap.set(path, url);
    }
  });

  await Promise.all(promises);
  return urlMap;
}

/**
 * Check if a URL is from our storage (needs signing)
 */
export function isStorageUrl(url: string): boolean {
  if (!url) return false;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  return url.includes(supabaseUrl) || url.includes('/storage/v1/');
}

/**
 * Get the bucket name from a storage URL
 */
export function getBucketFromUrl(url: string): string | null {
  try {
    const pattern = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\//;
    const match = url.match(pattern);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
