import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
}

interface CreateBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  onSuccess: () => void;
}

export default function CreateBidDialog({ open, onOpenChange, companyId, onSuccess }: CreateBidDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    project_id: '',
    submission_deadline: null as Date | null,
    valid_until: null as Date | null,
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount_percent: 0, total: 0 }
  ]);

  useEffect(() => {
    if (open && companyId) {
      fetchClientsAndProjects();
    }
  }, [open, companyId]);

  const fetchClientsAndProjects = async () => {
    if (!companyId) return;

    const [clientsRes, projectsRes] = await Promise.all([
      supabase.from('clients').select('id, full_name').eq('company_id', companyId).is('deleted_at', null),
      supabase.from('projects').select('id, name').eq('company_id', companyId).is('deleted_at', null),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
  };

  const generateBidNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const { count } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `BID-${year}${month}-${sequence}`;
  };

  const calculateLineItemTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percent / 100);
    return subtotal - discount;
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.total = calculateLineItemTotal(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount_percent: 0, total: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a bid title');
      return;
    }

    const validLineItems = lineItems.filter(item => item.description.trim());
    if (validLineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setLoading(true);
    try {
      const bidNumber = await generateBidNumber();

      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
          company_id: companyId,
          bid_number: bidNumber,
          title: formData.title,
          description: formData.description || null,
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          amount: totalAmount,
          submission_deadline: formData.submission_deadline?.toISOString() || null,
          valid_until: formData.valid_until?.toISOString() || null,
          notes: formData.notes || null,
          created_by: user.id,
          status: 'draft',
          internal_approval_status: 'pending',
          client_approval_status: 'pending',
        })
        .select()
        .single();

      if (bidError) throw bidError;

      // Insert line items
      const lineItemsToInsert = validLineItems.map((item, index) => ({
        bid_id: bid.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        total: item.total,
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from('bid_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) throw lineItemsError;

      // Log activity
      await supabase.from('bid_activity_log').insert({
        bid_id: bid.id,
        action: 'created',
        description: `Bid ${bidNumber} created`,
        performed_by: user.id,
      });

      toast.success('Bid created successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating bid:', error);
      toast.error('Failed to create bid');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      client_id: '',
      project_id: '',
      submission_deadline: null,
      valid_until: null,
      notes: '',
    });
    setLineItems([
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, discount_percent: 0, total: 0 }
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Bid</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Bid Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter bid title"
              />
            </div>

            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
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

            <div>
              <Label htmlFor="project">Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Submission Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.submission_deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.submission_deadline 
                      ? format(formData.submission_deadline, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.submission_deadline || undefined}
                    onSelect={(date) => setFormData({ ...formData, submission_deadline: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.valid_until && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_until 
                      ? format(formData.valid_until, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.valid_until || undefined}
                    onSelect={(date) => setFormData({ ...formData, valid_until: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter bid description"
                rows={3}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                  <div className="col-span-12 md:col-span-4">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Discount %"
                      value={item.discount_percent}
                      onChange={(e) => updateLineItem(item.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-8 md:col-span-1 flex items-center justify-end font-medium">
                    ${item.total.toFixed(2)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="text-lg font-semibold">
                Total: ${totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Bid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
