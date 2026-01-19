import { useState, useRef, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Model3DViewer = lazy(() => import('@/components/Model3DViewer'));
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
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FloorPlansPage() {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
    return matchesSearch && matchesProject;
  }) || [];

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
    if (!effectiveCompanyId || !name.trim() || !modelFile) {
      toast.error('Please fill in required fields and upload a model');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = modelFile.name.split('.').pop();
      const filePath = `${effectiveCompanyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(filePath, modelFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(filePath);

      const { error } = await supabase.from('floor_plans').insert({
        company_id: effectiveCompanyId,
        project_id: projectId || null,
        name: name.trim(),
        description: description.trim() || null,
        floor_number: floorNumber ? parseInt(floorNumber) : null,
        model_url: publicUrl,
        model_type: fileExt?.toLowerCase(),
        uploaded_by: user?.id,
      });

      if (error) throw error;

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
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              {searchTerm || projectFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first 3D model to get started'}
            </p>
            {!searchTerm && projectFilter === 'all' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Model
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFloorPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center relative group">
                {plan.thumbnail_url ? (
                  <img 
                    src={plan.thumbnail_url} 
                    alt={plan.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Box className="h-16 w-16 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      setSelectedFloorPlan(plan);
                      setIsViewerOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    asChild
                  >
                    <a href={plan.model_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{getModelTypeLabel(plan.model_type)}</Badge>
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
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload 3D Model</DialogTitle>
          </DialogHeader>

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
                  accept=".obj,.gltf,.glb,.ifc,.fbx,.dae,.stl"
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
                      Click to upload 3D model
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported: OBJ, GLTF, GLB, IFC, FBX, DAE, STL
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
        </DialogContent>
      </Dialog>

      {/* 3D Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={(open) => {
        setIsViewerOpen(open);
        if (!open) setSelectedFloorPlan(null);
      }}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              {selectedFloorPlan?.name || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center h-full bg-muted rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading 3D viewer...</p>
                </div>
              </div>
            }>
              {selectedFloorPlan && isViewerOpen && (
                <Model3DViewer 
                  modelUrl={selectedFloorPlan.model_url}
                  modelType={selectedFloorPlan.model_type}
                  modelName={selectedFloorPlan.name}
                />
              )}
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
