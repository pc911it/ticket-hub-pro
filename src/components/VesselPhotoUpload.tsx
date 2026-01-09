import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image, Trash2, Eye, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VesselPhoto {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: string;
  description: string | null;
  created_at: string;
  ticket_id: string | null;
}

interface VesselPhotoUploadProps {
  vesselId: string;
  companyId: string;
  readOnly?: boolean;
}

const photoCategories = [
  { value: 'general', label: 'General' },
  { value: 'before', label: 'Before Service' },
  { value: 'after', label: 'After Service' },
  { value: 'damage', label: 'Damage Documentation' },
  { value: 'maintenance', label: 'Maintenance Records' },
];

export const VesselPhotoUpload = ({ vesselId, companyId, readOnly = false }: VesselPhotoUploadProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewName, setPreviewName] = useState('');

  const { data: photos, isLoading } = useQuery({
    queryKey: ['vessel-photos', vesselId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_photos')
        .select('*')
        .eq('vessel_id', vesselId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as VesselPhoto[];
    },
    enabled: !!vesselId,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Create unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `vessels/${vesselId}/${timestamp}_${sanitizedName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
          });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('vessel_photos')
          .insert({
            vessel_id: vesselId,
            company_id: companyId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            category: selectedCategory,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: `Failed to save ${file.name}: ${dbError.message}`,
          });
        }
      }

      toast({
        title: 'Upload Complete',
        description: 'Photos uploaded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['vessel-photos', vesselId] });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred during upload.',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (photo: VesselPhoto) => {
    try {
      // Extract path from URL
      const urlParts = photo.file_url.split('/ticket-attachments/');
      if (urlParts.length > 1) {
        await supabase.storage
          .from('ticket-attachments')
          .remove([urlParts[1]]);
      }

      // Delete from database
      const { error } = await supabase
        .from('vessel_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Photo deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['vessel-photos', vesselId] });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete photo.',
      });
    }
  };

  const openPreview = (photo: VesselPhoto) => {
    setPreviewUrl(photo.file_url);
    setPreviewName(photo.file_name);
    setPreviewOpen(true);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (value: string) => {
    return photoCategories.find(c => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'before': return 'bg-warning/10 text-warning';
      case 'after': return 'bg-success/10 text-success';
      case 'damage': return 'bg-destructive/10 text-destructive';
      case 'maintenance': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Photo Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {photoCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button variant="default" disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </Button>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-lg border bg-card overflow-hidden"
            >
              <div className="aspect-square relative">
                <img
                  src={photo.file_url}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => openPreview(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(photo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium truncate">{photo.file_name}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(photo.category)}`}>
                    {getCategoryLabel(photo.category)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(photo.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No photos uploaded yet.</p>
          {!readOnly && (
            <p className="text-sm">Upload photos to document this vessel.</p>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{previewName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto">
            <img
              src={previewUrl}
              alt={previewName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
