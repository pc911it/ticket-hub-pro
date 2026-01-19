import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface SignedImageProps {
  bucket: string;
  path: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Component to display images from private storage buckets
 * Automatically generates a signed URL for the image
 */
export function SignedImage({ bucket, path, alt, className, fallback }: SignedImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!path) {
        setLoading(false);
        setError(true);
        return;
      }

      // Check if it's already a full URL (legacy data)
      if (path.startsWith('http://') || path.startsWith('https://')) {
        setSignedUrl(path);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          setError(true);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [bucket, path]);

  if (loading) {
    return <Skeleton className={className || 'w-full h-24'} />;
  }

  if (error || !signedUrl) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className || 'w-full h-24'}`}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
