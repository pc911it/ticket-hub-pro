import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentViewer } from '@/components/DocumentViewer';
import { 
  Search, 
  FolderOpen, 
  Folder, 
  FileText, 
  Image, 
  File, 
  ChevronRight,
  ChevronLeft,
  Building2,
  Filter,
  Grid,
  List,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
  address: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: string;
  created_at: string;
  project_id: string;
  projects: { name: string; status: string } | null;
}

const PLAN_CATEGORIES = [
  { value: 'all', label: 'All Plans' },
  { value: 'blueprint', label: 'Blueprints' },
  { value: 'floor_plan', label: 'Floor Plans' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'structural', label: 'Structural' },
  { value: 'site_plan', label: 'Site Plans' },
  { value: 'elevation', label: 'Elevations' },
  { value: 'other', label: 'Other' },
];

const ConstructionPlansPage = () => {
  const { user, isSuperAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDocument, setViewingDocument] = useState<Attachment | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchAllAttachments();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status, address')
      .is('deleted_at', null)
      .order('name');

    if (!error && data) {
      setProjects(data);
    }
  };

  const fetchAllAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_attachments')
      .select('*, projects(name, status)')
      .in('category', ['blueprint', 'floor_plan', 'electrical', 'plumbing', 'structural', 'site_plan', 'elevation', 'pdf', 'image', 'other'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttachments(data as Attachment[]);
    }
    setLoading(false);
  };

  const filteredAttachments = attachments.filter(attachment => {
    const matchesSearch = 
      attachment.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attachment.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || attachment.category === categoryFilter;
    const matchesProject = !selectedProject || attachment.project_id === selectedProject.id;
    
    return matchesSearch && matchesCategory && matchesProject;
  });

  const projectsWithPlans = projects.filter(project => 
    attachments.some(a => a.project_id === project.id)
  );

  const getPlansCountForProject = (projectId: string) => {
    return attachments.filter(a => a.project_id === projectId).length;
  };

  const getFileIcon = (fileType: string, category: string) => {
    if (category === 'blueprint' || category === 'floor_plan' || category === 'structural') {
      return <FileText className="h-5 w-5 text-primary" />;
    }
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-success" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-destructive" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'blueprint': return 'bg-primary/10 text-primary border-primary/30';
      case 'floor_plan': return 'bg-info/10 text-info border-info/30';
      case 'electrical': return 'bg-warning/10 text-warning border-warning/30';
      case 'plumbing': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
      case 'structural': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'site_plan': return 'bg-success/10 text-success border-success/30';
      case 'elevation': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Construction Plans</h1>
          <p className="text-muted-foreground mt-1">Browse and manage all construction plans and blueprints.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plans by name or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PLAN_CATEGORIES.slice(0, 5).map((cat) => (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setCategoryFilter('all')}
          >
            <Filter className="h-3 w-3" />
            More
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Projects Sidebar */}
        <Card className="lg:col-span-1 border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Project Folders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
              <div className="p-2 space-y-1">
                {/* All Projects Option */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    !selectedProject 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <Folder className="h-4 w-4" />
                  <span className="flex-1 text-left font-medium">All Projects</span>
                  <Badge variant="secondary" className="text-xs">
                    {attachments.length}
                  </Badge>
                </button>

                {/* Project Folders */}
                {projectsWithPlans.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      selectedProject?.id === project.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Folder className="h-4 w-4" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      {project.address && (
                        <p className="text-xs opacity-70 truncate">{project.address}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {getPlansCountForProject(project.id)}
                    </Badge>
                  </button>
                ))}

                {projectsWithPlans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No projects with plans yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Plans Grid/List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Breadcrumb */}
          {selectedProject && (
            <div className="flex items-center gap-2 text-sm">
              <button 
                onClick={() => setSelectedProject(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                All Projects
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedProject.name}
              </span>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredAttachments.length} plan{filteredAttachments.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Plans Display */}
          {filteredAttachments.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all' 
                    ? 'No plans match your search criteria.' 
                    : 'No construction plans uploaded yet.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload plans from the Projects page to see them here.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAttachments.map((attachment) => (
                <Card 
                  key={attachment.id} 
                  className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setViewingDocument(attachment)}
                >
                  <CardContent className="p-4">
                    {/* Preview */}
                    <div className="aspect-[4/3] bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                      {attachment.file_type.startsWith('image/') ? (
                        <img 
                          src={attachment.file_url} 
                          alt={attachment.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="h-16 w-16 text-muted-foreground/30" />
                      )}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        {getFileIcon(attachment.file_type, attachment.category)}
                        <p className="font-medium text-sm line-clamp-2 flex-1">{attachment.file_name}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", getCategoryBadgeColor(attachment.category))}>
                          {attachment.category.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </span>
                      </div>

                      {!selectedProject && attachment.projects && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {attachment.projects.name}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredAttachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => setViewingDocument(attachment)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        {getFileIcon(attachment.file_type, attachment.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{attachment.file_name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {!selectedProject && attachment.projects && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {attachment.projects.name}
                            </span>
                          )}
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>{format(new Date(attachment.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-xs shrink-0", getCategoryBadgeColor(attachment.category))}>
                        {attachment.category.replace('_', ' ')}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer
          documents={[{
            id: viewingDocument.id,
            file_name: viewingDocument.file_name,
            file_url: viewingDocument.file_url,
            file_type: viewingDocument.file_type
          }]}
          open={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default ConstructionPlansPage;
