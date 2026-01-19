import { useState, useRef, lazy, Suspense, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Model3DViewer = lazy(() => import('@/components/Model3DViewer'));
const CADViewer = lazy(() => import('@/components/CADViewer'));
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Box,
  Upload,
  Loader2,
  Trash2,
  Eye,
  Building,
  Layers,
  ExternalLink,
  Download,
  FileType,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { extractPathFromUrl } from '@/lib/secureStorage';

// Supported format info
const formatInfo: Record<string, { name: string; supported: boolean; description: string; category: 'model' | 'cad' }> = {
  gltf: { name: 'glTF', supported: true, description: 'GL Transmission Format - Web optimized', category: 'model' },
  glb: { name: 'GLB', supported: true, description: 'Binary glTF - Compact web format', category: 'model' },
  obj: { name: 'OBJ', supported: true, description: 'Wavefront OBJ - Universal 3D format', category: 'model' },
  stl: { name: 'STL', supported: true, description: 'Stereolithography - 3D printing format', category: 'model' },
  fbx: { name: 'FBX', supported: true, description: 'Autodesk FBX - Animation format', category: 'model' },
  dae: { name: 'Collada', supported: true, description: 'COLLADA - Digital asset exchange', category: 'model' },
  ifc: { name: 'IFC', supported: false, description: 'Industry Foundation Classes - BIM format', category: 'model' },
  dxf: { name: 'DXF', supported: true, description: 'AutoCAD Drawing Exchange Format - 2D/3D CAD', category: 'cad' },
  dwg: { name: 'DWG', supported: false, description: 'AutoCAD Drawing - Requires DXF export', category: 'cad' },
};

export default function FloorPlansPage() {
  const { effectiveCompanyId, isPlatformView } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [signedModelUrl, setSignedModelUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: floorPlans, isLoading } = useQuery({
    queryKey: ['floor-plans', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plans')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  const filteredFloorPlans = floorPlans?.filter(plan => {
    const matchesSearch = 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || plan.project_id === projectFilter;
    const matchesFormat = formatFilter === 'all' || plan.model_type?.toLowerCase() === formatFilter;
    return matchesSearch && matchesProject && matchesFormat;
  }) || [];

  // Get signed URL for viewing models from private bucket
  const getSignedUrl = async (modelUrl: string): Promise<string | null> => {
    try {
      let path = modelUrl;
      
      // If it's a full URL, extract the path
      if (modelUrl.startsWith('http')) {
        const extractedPath = extractPathFromUrl(modelUrl, 'floor-plans');
        if (!extractedPath) {
          console.error('Could not extract path from URL:', modelUrl);
          // Try to use the URL directly (might work if bucket was public before)
          return modelUrl;
        }
        path = extractedPath;
      }

      const { data, error } = await supabase.storage
        .from('floor-plans')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return null;
    }
  };

  // Handle opening the viewer with a signed URL
  const handleViewFloorPlan = async (plan: any) => {
    setSelectedFloorPlan(plan);
    setIsViewerOpen(true);
    setIsLoadingUrl(true);
    setSignedModelUrl(null);

    const url = await getSignedUrl(plan.model_url);
    if (url) {
      setSignedModelUrl(url);
    } else {
      toast.error('Failed to load model. Try downloading instead.');
    }
    setIsLoadingUrl(false);
  };

  // Handle download with signed URL
  const handleDownload = async (plan: any) => {
    const url = await getSignedUrl(plan.model_url);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Failed to get download link');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validTypes = ['.obj', '.gltf', '.glb', '.ifc', '.fbx', '.dae', '.stl'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(ext)) {
        toast.error('Please upload a valid 3D model file (OBJ, GLTF, GLB, IFC, FBX, DAE, STL)');
        return;
      }
      
      setModelFile(file);
    }
  };

  const handleCreate = async () => {
    // Detailed validation with specific error messages
    if (!effectiveCompanyId) {
      toast.error('No company selected. Please refresh and try again.');
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter a name for the floor plan');
      return;
    }
    
    if (!modelFile) {
      toast.error('Please select a 3D model file to upload');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to upload floor plans');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = modelFile.name.split('.').pop()?.toLowerCase();
      // Use a unique filename with timestamp and random suffix
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filePath = `${effectiveCompanyId}/${uniqueId}.${fileExt}`;

      console.log('Uploading file to path:', filePath);
      console.log('File size:', modelFile.size, 'bytes');
      console.log('File type:', modelFile.type);

      // Upload with explicit content type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(filePath, modelFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: modelFile.type || 'application/octet-stream',
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Store the file path, not the public URL (bucket is private)
      const { error } = await supabase.from('floor_plans').insert({
        company_id: effectiveCompanyId,
        project_id: projectId || null,
        name: name.trim(),
        description: description.trim() || null,
        floor_number: floorNumber ? parseInt(floorNumber) : null,
        model_url: filePath, // Store path, not public URL
        model_type: fileExt,
        uploaded_by: user?.id,
      });

      if (error) {
        console.error('Database insert error:', error);
        // Try to clean up the uploaded file if DB insert fails
        await supabase.storage.from('floor-plans').remove([filePath]);
        throw error;
      }

      toast.success('Floor plan uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error('Error uploading floor plan:', error);
      toast.error(error.message || 'Failed to upload floor plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteFloorPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Floor plan deleted');
      queryClient.invalidateQueries({ queryKey: ['floor-plans'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete floor plan');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setFloorNumber('');
    setProjectId('');
    setModelFile(null);
  };

  const getModelTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      obj: 'OBJ',
      gltf: 'glTF',
      glb: 'GLB',
      ifc: 'IFC',
      fbx: 'FBX',
      dae: 'Collada',
      stl: 'STL',
    };
    return types[type || ''] || type?.toUpperCase() || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">3D Floor Plans</h1>
          <p className="text-muted-foreground">View and manage 3D models and floor plans</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Model
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{floorPlans?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects with Models</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(floorPlans?.filter(p => p.project_id).map(p => p.project_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {floorPlans?.filter(p => p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search floor plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter by format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {Object.entries(formatInfo).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  {info.supported ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  {info.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Supported Formats Info */}
      <Card className="bg-muted/50">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <FileType className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Supported formats:</span>
            {Object.entries(formatInfo).filter(([_, info]) => info.supported).map(([key, info]) => (
              <Badge key={key} variant="secondary" className="text-xs">{info.name}</Badge>
            ))}
            <span className="text-muted-foreground ml-2">|</span>
            <span className="text-muted-foreground">Download only:</span>
            {Object.entries(formatInfo).filter(([_, info]) => !info.supported).map(([key, info]) => (
              <Badge key={key} variant="outline" className="text-xs">{info.name}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Floor Plans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredFloorPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Box className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No floor plans found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || projectFilter !== 'all' || formatFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first 3D model to get started'}
            </p>
            {!searchTerm && projectFilter === 'all' && formatFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Model
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFloorPlans.map((plan) => {
            const typeInfo = formatInfo[plan.model_type?.toLowerCase() || ''] || { name: plan.model_type, supported: false };
            return (
              <Card key={plan.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center relative group">
                  {plan.thumbnail_url ? (
                    <img 
                      src={plan.thumbnail_url} 
                      alt={plan.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Box className="h-16 w-16 text-muted-foreground" />
                      <Badge variant={typeInfo.supported ? "secondary" : "outline"}>
                        {typeInfo.name}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {typeInfo.supported ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleViewFloorPlan(plan)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View 3D
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-background">
                        Preview not available
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleDownload(plan)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={typeInfo.supported ? "default" : "outline"}
                          className={typeInfo.supported ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                        >
                          {typeInfo.supported ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {typeInfo.name}
                        </Badge>
                        {plan.floor_number && (
                          <Badge variant="outline">Floor {plan.floor_number}</Badge>
                        )}
                      </div>
                      {plan.project && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {plan.project.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {format(new Date(plan.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Floor Plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteFloorPlanMutation.mutate(plan.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload 3D Model</DialogTitle>
          </DialogHeader>

          {isPlatformView ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground mb-4">
                Please select a company from the company selector in the sidebar to upload floor plans.
              </p>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Floor plan name"
              />
            </div>

            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="floorNumber">Floor Number</Label>
              <Input
                id="floorNumber"
                type="number"
                value={floorNumber}
                onChange={(e) => setFloorNumber(e.target.value)}
                placeholder="e.g., 1, 2, -1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div>
              <Label>3D Model File *</Label>
              <div 
                className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".obj,.gltf,.glb,.ifc,.fbx,.dae,.stl,.dxf,.dwg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {modelFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Box className="h-6 w-6 text-primary" />
                      <span className="font-medium">{modelFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Box className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload 3D model or CAD file
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        3D: OBJ, GLTF, GLB, FBX, DAE, STL | CAD: DXF, DWG
                      </p>
                    </>
                  )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !modelFile}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3D Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={(open) => {
        setIsViewerOpen(open);
        if (!open) {
          setSelectedFloorPlan(null);
          setSignedModelUrl(null);
        }
      }}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              {selectedFloorPlan?.name || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              {selectedFloorPlan && formatInfo[selectedFloorPlan.model_type?.toLowerCase()]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            {isLoadingUrl ? (
              <div className="flex-1 flex items-center justify-center h-full bg-muted rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Preparing model...</p>
                </div>
              </div>
            ) : signedModelUrl && selectedFloorPlan ? (
              <Suspense fallback={
                <div className="flex-1 flex items-center justify-center h-full bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading viewer...</p>
                  </div>
                </div>
              }>
                {/* Use CADViewer for DXF/DWG files, Model3DViewer for others */}
                {['dxf', 'dwg'].includes(selectedFloorPlan.model_type?.toLowerCase()) ? (
                  <CADViewer 
                    modelUrl={signedModelUrl}
                    modelType={selectedFloorPlan.model_type}
                    modelName={selectedFloorPlan.name}
                  />
                ) : (
                  <Model3DViewer 
                    modelUrl={signedModelUrl}
                    modelType={selectedFloorPlan.model_type}
                    modelName={selectedFloorPlan.name}
                  />
                )}
              </Suspense>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full bg-muted rounded-lg">
                <div className="text-center p-8">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Failed to load model</p>
                  <Button 
                    variant="outline"
                    onClick={() => selectedFloorPlan && handleDownload(selectedFloorPlan)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Instead
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
