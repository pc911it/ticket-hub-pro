import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image, Trash2, Eye, Loader2 } from 'lucide-react';
import { getSecureFileUrl, extractPathFromUrl } from '@/lib/secureStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: string;
  created_at: string;
}

interface TicketAttachmentsProps {
  ticketId: string;
  readOnly?: boolean;
}

export const TicketAttachments = ({ ticketId, readOnly = false }: TicketAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const [loadingUrls, setLoadingUrls] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAttachments();
  }, [ticketId]);

  // Generate signed URLs for all attachments
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (attachments.length === 0) return;
      setLoadingUrls(true);
      const urlMap = new Map<string, string>();
      
      for (const att of attachments) {
        const signedUrl = await getSecureFileUrl('ticket-attachments', att.file_url);
        if (signedUrl) {
          urlMap.set(att.id, signedUrl);
        }
      }
      
      setSignedUrls(urlMap);
      setLoadingUrls(false);
    };
    
    generateSignedUrls();
  }, [attachments]);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (data) setAttachments(data);
    if (error) console.error('Error fetching attachments:', error);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'blueprint' | 'image') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Store file path (not public URL) for security
        const { error: dbError } = await supabase.from('ticket_attachments').insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_url: fileName, // Store path, not URL
          file_type: file.type,
          file_size: file.size,
          category,
        });

        if (dbError) throw dbError;
      }

      toast({ title: 'Success', description: 'Files uploaded successfully.' });
      fetchAttachments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // Extract file path from URL
      const urlParts = attachment.file_url.split('/ticket-attachments/');
      const filePath = urlParts[1];

      // Delete from storage
      await supabase.storage.from('ticket-attachments').remove([filePath]);

      // Delete from database
      const { error } = await supabase.from('ticket_attachments').delete().eq('id', attachment.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'File deleted successfully.' });
      fetchAttachments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const openPreview = async (attachment: Attachment) => {
    const signedUrl = signedUrls.get(attachment.id) || await getSecureFileUrl('ticket-attachments', attachment.file_url);
    setPreviewUrl(signedUrl);
    setPreviewType(attachment.file_type);
  };

  const images = attachments.filter(a => a.category === 'image');

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Ticket Images Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Ticket Images
          </Label>
          {!readOnly && (
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'image')}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button variant="outline" size="sm" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group rounded-lg overflow-hidden border bg-card aspect-square"
              >
                <img
                  src={signedUrls.get(attachment.id) || ''}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openPreview(attachment)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(attachment)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                  {attachment.file_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewType.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="w-full h-auto" />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh]"
                title="PDF Preview"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
