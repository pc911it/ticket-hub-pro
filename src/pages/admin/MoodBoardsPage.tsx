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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Palette,
  Share2,
  CheckCircle,
  Eye,
  ImagePlus,
  Trash2
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  shared: { label: 'Shared', color: 'bg-blue-500/10 text-blue-500' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-500' },
};

const MoodBoardsPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    client_id: '',
  });

  const { data: moodBoards, isLoading } = useQuery({
    queryKey: ['mood-boards', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('mood_boards')
        .select(`
          *,
          projects:project_id(name),
          clients:client_id(full_name),
          mood_board_items(id)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-for-boards', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-for-boards', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('company_id', effectiveCompanyId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: boardItems } = useQuery({
    queryKey: ['mood-board-items', selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard?.id) return [];
      const { data, error } = await supabase
        .from('mood_board_items')
        .select('*')
        .eq('mood_board_id', selectedBoard.id)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBoard?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('mood_boards').insert({
        company_id: effectiveCompanyId,
        title: data.title,
        description: data.description,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood-boards'] });
      toast.success('Mood board created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create mood board'),
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { board_id: string; type: string; image_url?: string; color?: string }) => {
      const { count } = await supabase
        .from('mood_board_items')
        .select('*', { count: 'exact', head: true })
        .eq('mood_board_id', data.board_id);

      const { error } = await supabase.from('mood_board_items').insert({
        mood_board_id: data.board_id,
        item_type: data.type,
        image_url: data.image_url,
        color_hex: data.color,
        sort_order: (count || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood-board-items'] });
      toast.success('Item added');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'shared') {
        updates.shared_at = new Date().toISOString();
      }
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('mood_boards')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood-boards'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      client_id: '',
    });
  };

  const filteredBoards = moodBoards?.filter(board =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.clients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = [
    { title: 'Total Boards', value: moodBoards?.length || 0, icon: Palette, color: 'text-purple-500' },
    { title: 'Shared', value: moodBoards?.filter(b => b.status === 'shared').length || 0, icon: Share2, color: 'text-blue-500' },
    { title: 'Approved', value: moodBoards?.filter(b => b.status === 'approved').length || 0, icon: CheckCircle, color: 'text-green-500' },
  ];

  // Sample colors for color picker
  const colorPalette = [
    '#F87171', '#FB923C', '#FBBF24', '#A3E635', '#34D399', '#22D3EE',
    '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8', '#FAFAFA', '#1F2937'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mood Boards</h1>
          <p className="text-muted-foreground">Create visual inspiration boards for projects</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Mood Board
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search mood boards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBoards.map((board) => (
          <Card 
            key={board.id} 
            className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
            onClick={() => setSelectedBoard(board)}
          >
            {/* Preview Grid */}
            <div className="h-32 bg-muted grid grid-cols-3 gap-1 p-2">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="bg-background rounded flex items-center justify-center"
                >
                  {board.mood_board_items?.[i] ? (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium">{board.title}</h3>
                  {board.projects?.name && (
                    <p className="text-sm text-muted-foreground">{board.projects.name}</p>
                  )}
                </div>
                <Badge className={statusConfig[board.status]?.color}>
                  {statusConfig[board.status]?.label}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{board.mood_board_items?.length || 0} items</span>
                <span>{format(new Date(board.created_at), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBoards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No mood boards found. Create your first one!
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Mood Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Kitchen Renovation Ideas"
                />
              </div>
              <div>
                <Label>Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) => {
                    const project = projects?.find(p => p.id === v);
                    setFormData({ 
                      ...formData, 
                      project_id: v,
                      client_id: project?.client_id || ''
                    });
                  }}
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
              <div>
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the theme or style direction..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Board'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Board Detail Sheet */}
      <Sheet open={!!selectedBoard} onOpenChange={() => setSelectedBoard(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedBoard && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedBoard.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <Badge className={statusConfig[selectedBoard.status]?.color}>
                    {statusConfig[selectedBoard.status]?.label}
                  </Badge>
                  <div className="flex gap-2">
                    {selectedBoard.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: selectedBoard.id, status: 'shared' })}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share with Client
                      </Button>
                    )}
                    {selectedBoard.status === 'shared' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: selectedBoard.id, status: 'approved' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Approved
                      </Button>
                    )}
                  </div>
                </div>

                {selectedBoard.description && (
                  <p className="text-sm text-muted-foreground">{selectedBoard.description}</p>
                )}

                {/* Add Items */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Add to Board</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Add Color Swatch</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {colorPalette.map((color) => (
                            <button
                              key={color}
                              className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-primary transition-colors"
                              style={{ backgroundColor: color }}
                              onClick={() => addItemMutation.mutate({
                                board_id: selectedBoard.id,
                                type: 'color',
                                color: color
                              })}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Add Image URL</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            id="image-url"
                            placeholder="https://..."
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById('image-url') as HTMLInputElement;
                              if (input.value) {
                                addItemMutation.mutate({
                                  board_id: selectedBoard.id,
                                  type: 'image',
                                  image_url: input.value
                                });
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Board Items Grid */}
                <div>
                  <h4 className="font-medium mb-3">Board Items ({boardItems?.length || 0})</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {boardItems?.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg border overflow-hidden relative group"
                      >
                        {item.item_type === 'color' && (
                          <div 
                            className="w-full h-full" 
                            style={{ backgroundColor: item.color_hex }}
                          />
                        )}
                        {item.item_type === 'image' && item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          className="absolute top-1 right-1 p-1 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            await supabase.from('mood_board_items').delete().eq('id', item.id);
                            queryClient.invalidateQueries({ queryKey: ['mood-board-items'] });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(!boardItems || boardItems.length === 0) && (
                      <div className="col-span-3 text-center py-8 text-muted-foreground">
                        No items yet. Add colors or images above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MoodBoardsPage;
