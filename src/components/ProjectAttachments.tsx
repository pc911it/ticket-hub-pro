import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentViewer } from '@/components/DocumentViewer';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: string;
  created_at: string;
}

interface ProjectAttachmentsProps {
  projectId: string;
  readOnly?: boolean;
}

export const ProjectAttachments = ({ projectId, readOnly = false }: ProjectAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchAttachments();
  }, [projectId]);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
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
        const fileName = `projects/${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase.from('project_attachments').insert({
          project_id: projectId,
          file_name: file.name,
          file_url: urlData.publicUrl,
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
      const { error } = await supabase.from('project_attachments').delete().eq('id', attachment.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'File deleted successfully.' });
      fetchAttachments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const blueprints = attachments.filter(a => a.category === 'blueprint');
  const images = attachments.filter(a => a.category === 'image');
  const allDocuments = [...blueprints, ...images];

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Blueprints / PDF Plans Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Blueprints & Construction Plans
          </Label>
          {!readOnly && (
            <div className="relative">
              <Input
                type="file"
                accept=".pdf,.dwg,.dxf"
                multiple
                onChange={(e) => handleFileUpload(e, 'blueprint')}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button variant="outline" size="sm" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          )}
        </div>
        
        {blueprints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blueprints uploaded yet.</p>
        ) : (
          <div className="grid gap-2">
            {blueprints.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-8 w-8 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewer(allDocuments.findIndex(d => d.id === attachment.id)); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(attachment); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Images Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Project Images
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
          <p className="text-sm text-muted-foreground">No project images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group rounded-lg overflow-hidden border bg-card aspect-square"
              >
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewer(allDocuments.findIndex(d => d.id === attachment.id)); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button variant="destructive" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(attachment); }}>
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

      {/* Document Viewer */}
      <DocumentViewer
        documents={allDocuments}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};