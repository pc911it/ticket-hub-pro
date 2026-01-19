import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { extractPathFromUrl } from '@/lib/secureStorage';

interface SignedFileLinkProps {
  bucket: string;
  path: string;
  fileName?: string;
  className?: string;
  children?: React.ReactNode;
  download?: boolean;
  showIcon?: boolean;
}

/**
 * Component to create a downloadable/viewable link for files in private storage buckets
 * Automatically generates a signed URL when clicked
 */
export function SignedFileLink({ 
  bucket, 
  path, 
  fileName, 
  className, 
  children,
  download = false,
  showIcon = true
}: SignedFileLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let filePath = path;
      
      // If it's a full URL, extract the path
      if (path.startsWith('http')) {
        const extractedPath = extractPathFromUrl(path, bucket);
        if (extractedPath) {
          filePath = extractedPath;
        } else {
          // Fallback to original URL
          window.open(path, '_blank');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600, { download });

      if (error) {
        console.error('Error creating signed URL:', error);
        // Try opening original URL as fallback
        window.open(path, '_blank');
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error getting signed URL:', err);
      window.open(path, '_blank');
    } finally {
      setLoading(false);
    }
  };

  const displayName = fileName || path.split('/').pop() || 'File';

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className || "flex items-center gap-2 text-primary hover:underline"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        download ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />
      ) : null}
      {children || displayName}
    </a>
  );
}

interface SignedFileButtonProps {
  bucket: string;
  path: string;
  fileName?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  download?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Button component to download/view files from private storage buckets
 */
export function SignedFileButton({ 
  bucket, 
  path, 
  fileName,
  variant = 'outline',
  size = 'sm',
  download = false,
  children,
  className
}: SignedFileButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    
    try {
      let filePath = path;
      
      if (path.startsWith('http')) {
        const extractedPath = extractPathFromUrl(path, bucket);
        if (extractedPath) {
          filePath = extractedPath;
        } else {
          window.open(path, '_blank');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600, { download });

      if (error) {
        console.error('Error creating signed URL:', error);
        window.open(path, '_blank');
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error getting signed URL:', err);
      window.open(path, '_blank');
    } finally {
      setLoading(false);
    }
  };

  const displayName = fileName || path.split('/').pop() || 'Download';

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : download ? (
        <Download className="h-4 w-4 mr-1" />
      ) : (
        <ExternalLink className="h-4 w-4 mr-1" />
      )}
      {children || displayName}
    </Button>
  );
}

interface UseSignedUrlResult {
  url: string | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to get a signed URL for a file in a private bucket
 */
export function useSecureUrl(bucket: string, path: string | null): UseSignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUrl = useCallback(async () => {
    if (!path) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      let filePath = path;
      
      // If it's a full URL, extract the path
      if (path.startsWith('http')) {
        const extractedPath = extractPathFromUrl(path, bucket);
        if (extractedPath) {
          filePath = extractedPath;
        } else {
          // Use original URL as fallback
          setUrl(path);
          setLoading(false);
          return;
        }
      }

      const { data, error: supabaseError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);

      if (supabaseError) {
        console.error('Error creating signed URL:', supabaseError);
        setError(true);
        // Try using original path as fallback for legacy URLs
        if (path.startsWith('http')) {
          setUrl(path);
        }
      } else {
        setUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [bucket, path]);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  return { url, loading, error, refresh: fetchUrl };
}

/**
 * Helper function to get a signed URL (non-hook version for event handlers)
 */
export async function getSignedFileUrl(
  bucket: string, 
  path: string
): Promise<string | null> {
  try {
    let filePath = path;
    
    if (path.startsWith('http')) {
      const extractedPath = extractPathFromUrl(path, bucket);
      if (extractedPath) {
        filePath = extractedPath;
      } else {
        return path;
      }
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return path.startsWith('http') ? path : null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
}
