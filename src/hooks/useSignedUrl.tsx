import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Default URL expiry time in seconds (1 hour)
const DEFAULT_EXPIRY = 3600;

interface SignedUrlOptions {
  expiresIn?: number; // seconds
  download?: boolean;
}

interface SignedUrlResult {
  url: string | null;
  error: Error | null;
}

/**
 * Hook to generate signed URLs for private storage buckets
 * Use this for all file downloads from private buckets
 */
export function useSignedUrl() {
  const [loading, setLoading] = useState(false);

  const getSignedUrl = useCallback(async (
    bucket: string,
    path: string,
    options: SignedUrlOptions = {}
  ): Promise<SignedUrlResult> => {
    const { expiresIn = DEFAULT_EXPIRY, download = false } = options;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn, {
          download: download ? path.split('/').pop() : undefined,
        });

      if (error) {
        console.error('Error creating signed URL:', error);
        return { url: null, error };
      }

      return { url: data.signedUrl, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create signed URL');
      return { url: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const getMultipleSignedUrls = useCallback(async (
    bucket: string,
    paths: string[],
    options: SignedUrlOptions = {}
  ): Promise<Map<string, string>> => {
    const { expiresIn = DEFAULT_EXPIRY } = options;
    const urlMap = new Map<string, string>();

    try {
      setLoading(true);
      
      // Batch request for multiple URLs
      const promises = paths.map(async (path) => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);
        
        if (!error && data) {
          urlMap.set(path, data.signedUrl);
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.error('Error creating multiple signed URLs:', err);
    } finally {
      setLoading(false);
    }

    return urlMap;
  }, []);

  return {
    getSignedUrl,
    getMultipleSignedUrls,
    loading,
  };
}

/**
 * Get a signed URL synchronously (returns a promise)
 * Use this in non-hook contexts
 */
export async function getSignedFileUrl(
  bucket: string,
  path: string,
  expiresIn: number = DEFAULT_EXPIRY
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error creating signed URL:', err);
    return null;
  }
}

/**
 * Helper to extract bucket and path from a full storage URL
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
    
    if (pathParts.length === 2) {
      const [bucket, ...pathSegments] = pathParts[1].split('/');
      return {
        bucket,
        path: pathSegments.join('/'),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}
