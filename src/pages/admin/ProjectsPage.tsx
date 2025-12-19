import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MapPin, Edit2, Trash2, Calendar, DollarSign, Building2, Paperclip, Eye, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectAttachments } from '@/components/ProjectAttachments';
import { AgentAssignment } from '@/components/AgentAssignment';
import { ProjectInvitations } from '@/components/ProjectInvitations';
import { CompanyPartnerships } from '@/components/CompanyPartnerships';
import { PartnerProjects } from '@/components/PartnerProjects';
import { ProjectChat } from '@/components/ProjectChat';
import { PendingPartnerships } from '@/components/PendingPartnerships';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  clients: { full_name: string } | null;
}

const ProjectsPage = () => {
  const { user, isCompanyOwner, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canDelete = isCompanyOwner || isSuperAdmin || isCompanyAdmin;
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    status: 'active',
    start_date: '',
    end_date: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    budget: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        // Super admin can see all projects
        fetchData();
      } else {
        fetchUserCompany();
      }
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (userCompanyId) {
      fetchData();
    }
  }, [userCompanyId]);

  const fetchUserCompany = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setUserCompanyId(data.company_id);
    } else {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    const [{ data: projectsData }, { data: clientsData }] = await Promise.all([
      supabase.from('projects').select('*, clients(full_name)').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, full_name').is('deleted_at', null).order('full_name'),
    ]);

    if (projectsData) setProjects(projectsData);
    if (clientsData) setClients(clientsData);
    setLoading(false);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      client_id: '',
      status: 'active',
      start_date: '',
      end_date: '',
      address: '',
      apartment: '',
      city: '',
      state: '',
      zip_code: '',
      budget: '',
      notes: '',
    });
    setEditingProject(null);
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      // Parse address components from stored address if available
      const addressParts = project.address?.split('|') || [];
      setFormData({
        name: project.name,
        description: project.description || '',
        client_id: project.client_id || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        address: addressParts[0] || '',
        apartment: addressParts[1] || '',
        city: addressParts[2] || '',
        state: addressParts[3] || '',
        zip_code: addressParts[4] || '',
        budget: project.budget?.toString() || '',
        notes: project.notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine address fields with pipe separator for storage
    const fullAddress = [
      formData.address,
      formData.apartment,
      formData.city,
      formData.state,
      formData.zip_code,
    ].join('|');

    const payload = {
      name: formData.name,
      description: formData.description || null,
      client_id: formData.client_id || null,
      status: formData.status,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      address: fullAddress || null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      notes: formData.notes || null,
      created_by: user?.id,
      company_id: userCompanyId,
    };

    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', editingProject.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update project.' });
      } else {
        toast({ title: 'Success', description: 'Project updated successfully.' });
        fetchData();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('projects').insert(payload);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create project.' });
      } else {
        toast({ title: 'Success', description: 'Project created successfully.' });
        fetchData();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteProject) return;
    setDeleting(true);

    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteProject.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete project.' });
    } else {
      toast({ title: 'Moved to Trash', description: 'Project moved to trash. You can restore it within 30 days.' });
      fetchData();
    }
    setDeleting(false);
    setDeleteProject(null);
  };

  const toggleProjectSelection = (id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllProjects = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;
    setDeleting(true);

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', Array.from(selectedProjects));

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete projects.' });
    } else {
      toast({ title: 'Moved to Trash', description: `${selectedProjects.size} project(s) moved to trash.` });
      setSelectedProjects(new Set());
      fetchData();
    }
    setDeleting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/30';
      case 'completed': return 'bg-info/10 text-info border-info/30';
      case 'on-hold': return 'bg-warning/10 text-warning border-warning/30';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/30';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage construction projects and jobs.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update project details.' : 'Add a new construction project.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Downtown Office Renovation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Project Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apartment">Apartment #</Label>
                  <Input
                    id="apartment"
                    value={formData.apartment}
                    onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                    placeholder="Apt 4B"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Project scope and details..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes..."
                />
              </div>

              {/* Agent Assignment - Only show when editing */}
              {editingProject && (
                <div className="border-t pt-4">
                  <AgentAssignment projectId={editingProject.id} onUpdate={fetchData} />
                </div>
              )}

              {/* File Attachments - Only show when editing */}
              {editingProject && (
                <div className="border-t pt-4">
                  <ProjectAttachments projectId={editingProject.id} />
                </div>
              )}

              {/* Project Invitations - Only show when editing */}
              {editingProject && (
                <div className="border-t pt-4">
                  <ProjectInvitations projectId={editingProject.id} projectName={editingProject.name} />
                </div>
              )}

              {/* Company Partnerships - Only show when editing */}
              {editingProject && (
                <div className="border-t pt-4">
                  <CompanyPartnerships projectId={editingProject.id} projectName={editingProject.name} />
                </div>
              )}

              {/* Project Chat - Only show when editing */}
              {editingProject && (
                <div className="border-t pt-4">
                  <ProjectChat projectId={editingProject.id} />
                </div>
              )}

              {!editingProject && (
                <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  You can assign agents and upload files after creating the project.
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProject ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Partnership Invitations */}
      <PendingPartnerships />

      {/* Partner Projects Section */}
      <PartnerProjects />

      {/* Bulk Actions */}
      {canDelete && filteredProjects.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
            onCheckedChange={selectAllProjects}
          />
          <span className="text-sm text-muted-foreground">
            {selectedProjects.size > 0 ? `${selectedProjects.size} selected` : 'Select all'}
          </span>
          {selectedProjects.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedProjects.size})
            </Button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No projects found matching your filters.'
                : 'No projects yet. Create your first project!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => (
            <Card
              key={project.id}
              className="border-0 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {canDelete && (
                      <Checkbox
                        checked={selectedProjects.has(project.id)}
                        onCheckedChange={() => toggleProjectSelection(project.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <Link to={`/admin/projects/${project.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(project)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteProject(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {project.clients && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Client: {project.clients.full_name}
                  </p>
                )}

                <div className="space-y-1.5 text-sm">
                  {project.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}
                  {(project.start_date || project.end_date) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {project.start_date && format(new Date(project.start_date), 'MMM d, yyyy')}
                        {project.start_date && project.end_date && ' - '}
                        {project.end_date && format(new Date(project.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {project.budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span>${project.budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{project.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        onConfirm={handleDelete}
        title="Project"
        itemName={deleteProject?.name || ''}
        itemType="project"
        loading={deleting}
      />
    </div>
  );
};

export default ProjectsPage;