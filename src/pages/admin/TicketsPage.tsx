import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Calendar, Clock, Edit2, Trash2, CheckCircle2, Package, Paperclip, FileText, Image } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MaterialAssignment, MaterialAssignmentItem, saveInventoryUsage } from '@/components/MaterialAssignment';
import { Badge } from '@/components/ui/badge';
import { TicketAttachments } from '@/components/TicketAttachments';

interface Client {
  id: string;
  full_name: string;
}

interface Ticket {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  clients: { full_name: string } | null;
}

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [materials, setMaterials] = useState<MaterialAssignmentItem[]>([]);
  const [existingMaterialCount, setExistingMaterialCount] = useState<Record<string, number>>({});
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, { blueprints: number; images: number }>>({});
  const [selectedTicketForAttachments, setSelectedTicketForAttachments] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    status: 'pending',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: ticketsData }, { data: clientsData }, { data: usageData }, { data: attachmentsData }] = await Promise.all([
      supabase.from('tickets').select('*, clients(full_name)').order('scheduled_date', { ascending: false }),
      supabase.from('clients').select('id, full_name').order('full_name'),
      supabase.from('inventory_usage').select('ticket_id'),
      supabase.from('ticket_attachments').select('ticket_id, category'),
    ]);

    if (ticketsData) setTickets(ticketsData);
    if (clientsData) setClients(clientsData);
    
    // Count materials per ticket
    if (usageData) {
      const counts: Record<string, number> = {};
      usageData.forEach(u => {
        counts[u.ticket_id] = (counts[u.ticket_id] || 0) + 1;
      });
      setExistingMaterialCount(counts);
    }

    // Count attachments per ticket
    if (attachmentsData) {
      const counts: Record<string, { blueprints: number; images: number }> = {};
      attachmentsData.forEach(a => {
        if (!counts[a.ticket_id]) counts[a.ticket_id] = { blueprints: 0, images: 0 };
        if (a.category === 'blueprint') counts[a.ticket_id].blueprints++;
        else counts[a.ticket_id].images++;
      });
      setAttachmentCounts(counts);
    }
    
    setLoading(false);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.clients?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      title: '',
      description: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      status: 'pending',
    });
    setMaterials([]);
    setEditingTicket(null);
  };

  const handleOpenDialog = async (ticket?: Ticket) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({
        client_id: ticket.client_id,
        title: ticket.title,
        description: ticket.description || '',
        scheduled_date: ticket.scheduled_date,
        scheduled_time: ticket.scheduled_time,
        duration_minutes: ticket.duration_minutes,
        status: ticket.status,
      });
      
      // Load existing materials for this ticket
      const { data: usageData } = await supabase
        .from('inventory_usage')
        .select('inventory_item_id, quantity_planned, inventory_items(name, unit)')
        .eq('ticket_id', ticket.id);
      
      if (usageData) {
        setMaterials(usageData.map(u => ({
          inventory_item_id: u.inventory_item_id,
          quantity_planned: u.quantity_planned || 0,
          name: (u.inventory_items as any)?.name,
          unit: (u.inventory_items as any)?.unit,
        })));
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      created_by: user?.id,
    };

    if (editingTicket) {
      const { error } = await supabase
        .from('tickets')
        .update(formData)
        .eq('id', editingTicket.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update ticket.' });
        return;
      }

      // Handle material updates: remove old, add new
      await supabase.from('inventory_usage').delete().eq('ticket_id', editingTicket.id);
      
      if (materials.length > 0) {
        await saveInventoryUsage(editingTicket.id, materials);
      }

      toast({ title: 'Success', description: 'Ticket updated successfully.' });
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } else {
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create ticket.' });
        return;
      }

      // Save materials and deduct from inventory
      if (materials.length > 0 && ticketData) {
        await saveInventoryUsage(ticketData.id, materials);
      }

      toast({ title: 'Success', description: 'Ticket created successfully.' });
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    } else {
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    const { error } = await supabase.from('tickets').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete ticket.' });
    } else {
      toast({ title: 'Success', description: 'Ticket deleted successfully.' });
      fetchData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/10 text-success border-success/30';
      case 'pending': return 'bg-warning/10 text-warning border-warning/30';
      case 'completed': return 'bg-info/10 text-info border-info/30';
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
          <h1 className="text-3xl font-display font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage appointments and bookings.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
              </DialogTitle>
              <DialogDescription>
                {editingTicket ? 'Update ticket details and attachments.' : 'Schedule a new appointment. You can add files after creating the ticket.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
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
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Consultation, Follow-up"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Materials Assignment */}
              <MaterialAssignment
                value={materials}
                onChange={setMaterials}
              />

              {/* File Attachments - Only show when editing */}
              {editingTicket && (
                <div className="border-t pt-4">
                  <TicketAttachments ticketId={editingTicket.id} />
                </div>
              )}

              {!editingTicket && (
                <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  You can upload blueprints, plans, and images after creating the ticket.
                </p>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTicket ? 'Update' : 'Create'}
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
            placeholder="Search tickets..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No tickets found matching your filters.' 
                : 'No tickets yet. Create your first ticket!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket, index) => (
            <Card 
              key={ticket.id} 
              className="border-0 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">{ticket.title}</h3>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium capitalize border",
                        getStatusColor(ticket.status)
                      )}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ticket.clients?.full_name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(ticket.scheduled_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {ticket.scheduled_time} ({ticket.duration_minutes} min)
                      </div>
                      {existingMaterialCount[ticket.id] > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            {existingMaterialCount[ticket.id]} material{existingMaterialCount[ticket.id] !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                      {(attachmentCounts[ticket.id]?.blueprints > 0 || attachmentCounts[ticket.id]?.images > 0) && (
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            {attachmentCounts[ticket.id]?.blueprints > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {attachmentCounts[ticket.id].blueprints}
                              </span>
                            )}
                            {attachmentCounts[ticket.id]?.images > 0 && (
                              <span className="flex items-center gap-1 ml-1">
                                <Image className="h-3 w-3" />
                                {attachmentCounts[ticket.id].images}
                              </span>
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTicketForAttachments(ticket)}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      Files
                    </Button>
                    {ticket.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-success border-success/30 hover:bg-success/10"
                        onClick={() => handleStatusChange(ticket.id, 'confirmed')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                    )}
                    {ticket.status === 'confirmed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-info border-info/30 hover:bg-info/10"
                        onClick={() => handleStatusChange(ticket.id, 'completed')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenDialog(ticket)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(ticket.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attachments Sheet */}
      <Sheet open={!!selectedTicketForAttachments} onOpenChange={() => setSelectedTicketForAttachments(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ticket Attachments</SheetTitle>
            <SheetDescription>
              {selectedTicketForAttachments?.title} - {selectedTicketForAttachments?.clients?.full_name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedTicketForAttachments && (
              <TicketAttachments ticketId={selectedTicketForAttachments.id} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TicketsPage;
