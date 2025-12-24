import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

export const InvoiceLineItems = ({ items, onChange, readOnly = false }: InvoiceLineItemsProps) => {
  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    });
    onChange(updated);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-2 text-right">Rate</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-1"></div>
      </div>
      
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5">
            <Input
              placeholder="Item description"
              value={item.description}
              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
              disabled={readOnly}
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
              disabled={readOnly}
              className="text-sm text-right"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.rate}
              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
              disabled={readOnly}
              className="text-sm text-right"
            />
          </div>
          <div className="col-span-2 text-right font-medium text-sm">
            ${item.amount.toFixed(2)}
          </div>
          <div className="col-span-1 text-right">
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Line Item
        </Button>
      )}
      
      <div className="border-t pt-3 mt-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
