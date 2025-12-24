import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceLineItems, LineItem } from './InvoiceLineItems';
import { Loader2 } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  projects?: Project[];
  onSubmit: (data: {
    client_id: string;
    project_id?: string;
    description: string;
    notes: string;
    due_date: string;
    line_items: LineItem[];
    amount: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  clients,
  projects = [],
  onSubmit,
  isLoading,
}: CreateInvoiceDialogProps) => {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async () => {
    if (!clientId || !dueDate || total === 0) return;
    
    await onSubmit({
      client_id: clientId,
      project_id: projectId || undefined,
      description,
      notes,
      due_date: dueDate,
      line_items: lineItems.filter(item => item.description && item.amount > 0),
      amount: Math.round(total * 100),
    });

    // Reset form
    setClientId('');
    setProjectId('');
    setDescription('');
    setNotes('');
    setDueDate('');
    setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
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
            
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Invoice description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            <InvoiceLineItems items={lineItems} onChange={setLineItems} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes for the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!clientId || !dueDate || total === 0 || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
