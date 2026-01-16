import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  ClipboardList,
  CheckCircle,
  Circle,
  Calendar,
  Trash2
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-500/10 text-yellow-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500' },
};

const categoryOptions = [
  'Electrical', 'Plumbing', 'HVAC', 'Finish', 'Structural', 'Painting', 
  'Flooring', 'Drywall', 'Trim', 'Cleanup', 'Other'
];

const PunchListsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [punchItems, setPunchItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    walkthrough_date: '',
  });

  const [newItem, setNewItem] = useState({
    location: '',
    description: '',
    category: '',
    priority: 'medium',
  });

  const { data: punchLists, isLoading } = useQuery({
    queryKey: ['punch-lists', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('punch_lists')
        .select(`
          *,
          projects:project_id(name),
          punch_list_items(id, status)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-punch', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  // Fetch items for selected list
  const { data: listItems } = useQuery({
    queryKey: ['punch-list-items', selectedList?.id],
    queryFn: async () => {
      if (!selectedList?.id) return [];
      const { data, error } = await supabase
        .from('punch_list_items')
        .select('*')
        .eq('punch_list_id', selectedList.id)
        .order('item_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedList?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: list, error } = await supabase
        .from('punch_lists')
        .insert({
          company_id: effectiveCompanyId,
          title: data.title,
          description: data.description,
          project_id: data.project_id || null,
          due_date: data.due_date || null,
          walkthrough_date: data.walkthrough_date || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-lists'] });
      toast.success('Punch list created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create punch list'),
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const { count } = await supabase
        .from('punch_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('punch_list_id', selectedList.id);

      const { error } = await supabase.from('punch_list_items').insert({
        punch_list_id: selectedList.id,
        item_number: (count || 0) + 1,
        location: data.location,
        description: data.description,
        category: data.category,
        priority: data.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-list-items'] });
      queryClient.invalidateQueries({ queryKey: ['punch-lists'] });
      toast.success('Item added');
      setNewItem({ location: '', description: '', category: '', priority: 'medium' });
    },
    onError: () => toast.error('Failed to add item'),
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('punch_list_items')
        .update({
          status: completed ? 'completed' : 'open',
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-list-items'] });
      queryClient.invalidateQueries({ queryKey: ['punch-lists'] });
    },
    onError: () => toast.error('Failed to update item'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      due_date: '',
      walkthrough_date: '',
    });
  };

  const filteredLists = punchLists?.filter(list => {
    const matchesSearch = list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || list.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getProgress = (list: any) => {
    const items = list.punch_list_items || [];
    if (items.length === 0) return 0;
    const completed = items.filter((i: any) => i.status === 'completed').length;
    return Math.round((completed / items.length) * 100);
  };

  const stats = [
    { title: 'Total Lists', value: punchLists?.length || 0, icon: ClipboardList, color: 'text-blue-500' },
    { title: 'Open Items', value: punchLists?.reduce((sum, l) => sum + (l.punch_list_items?.filter((i: any) => i.status !== 'completed').length || 0), 0) || 0, icon: Circle, color: 'text-yellow-500' },
    { title: 'Completed Items', value: punchLists?.reduce((sum, l) => sum + (l.punch_list_items?.filter((i: any) => i.status === 'completed').length || 0), 0) || 0, icon: CheckCircle, color: 'text-green-500' },
  ];

  return (
    <FeatureGate featureKey="punch_lists" showUpgradePrompt featureName="Punch Lists">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Punch Lists</h1>
            <p className="text-muted-foreground">Track and complete project punch list items</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Punch List
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search punch lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list) => {
            const progress = getProgress(list);
            const totalItems = list.punch_list_items?.length || 0;
            const completedItems = list.punch_list_items?.filter((i: any) => i.status === 'completed').length || 0;
            
            return (
              <Card 
                key={list.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedList(list)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{list.title}</h3>
                      <p className="text-sm text-muted-foreground">{list.projects?.name}</p>
                    </div>
                    <Badge className={statusConfig[list.status]?.color}>
                      {statusConfig[list.status]?.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{completedItems}/{totalItems} items</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {list.due_date && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Due {format(new Date(list.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredLists.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No punch lists found
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Punch List</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Punch list title"
                  />
                </div>
                <div>
                  <Label>Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Walkthrough Date</Label>
                    <Input
                      type="date"
                      value={formData.walkthrough_date}
                      onChange={(e) => setFormData({ ...formData, walkthrough_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!selectedList} onOpenChange={() => setSelectedList(null)}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedList && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedList.title}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="flex gap-2">
                    <Badge className={statusConfig[selectedList.status]?.color}>
                      {statusConfig[selectedList.status]?.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{listItems?.filter(i => i.status === 'completed').length || 0}/{listItems?.length || 0}</span>
                    </div>
                    <Progress value={listItems?.length ? (listItems.filter(i => i.status === 'completed').length / listItems.length) * 100 : 0} />
                  </div>

                  {/* Add Item Form */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Add Item</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Location"
                            value={newItem.location}
                            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                          />
                          <Select
                            value={newItem.category}
                            onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          placeholder="Description *"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        />
                        <Button 
                          className="w-full" 
                          onClick={() => addItemMutation.mutate(newItem)}
                          disabled={!newItem.description || addItemMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items List */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Items ({listItems?.length || 0})</h4>
                    {listItems?.map((item) => (
                      <div 
                        key={item.id}
                        className={`p-3 border rounded-lg flex items-start gap-3 ${item.status === 'completed' ? 'bg-muted/50' : ''}`}
                      >
                        <Checkbox
                          checked={item.status === 'completed'}
                          onCheckedChange={(checked) => toggleItemMutation.mutate({ id: item.id, completed: !!checked })}
                        />
                        <div className="flex-1">
                          <p className={`text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {item.description}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {item.location && (
                              <Badge variant="outline" className="text-xs">{item.location}</Badge>
                            )}
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!listItems || listItems.length === 0) && (
                      <p className="text-center py-8 text-muted-foreground">No items yet</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  );
};

export default PunchListsPage;
