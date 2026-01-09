import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package } from 'lucide-react';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  inventoryItemId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  cost_per_unit: number | null;
  unit: string | null;
}

interface InvoiceLineItemsWithInventoryProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  companyId: string | null;
  readOnly?: boolean;
}

export const InvoiceLineItemsWithInventory = ({ 
  items, 
  onChange, 
  companyId,
  readOnly = false 
}: InvoiceLineItemsWithInventoryProps) => {
  // Fetch inventory items for the company
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-for-invoice', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('inventory_items')
        .select('id, name, description, cost_per_unit, unit')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name');
      return (data || []) as InventoryItem[];
    },
    enabled: !!companyId,
  });

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

  const addFromInventory = (inventoryId: string) => {
    const inventoryItem = inventoryItems?.find(i => i.id === inventoryId);
    if (!inventoryItem) return;

    const rate = inventoryItem.cost_per_unit || 0;
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: inventoryItem.name + (inventoryItem.unit ? ` (${inventoryItem.unit})` : ''),
      quantity: 1,
      rate: rate,
      amount: rate,
      inventoryItemId: inventoryItem.id,
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
            <div className="flex items-center gap-1">
              {item.inventoryItemId && (
                <Package className="h-4 w-4 text-primary shrink-0" />
              )}
              <Input
                placeholder="Item description"
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                disabled={readOnly}
                className="text-sm"
              />
            </div>
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Item
          </Button>
          
          {inventoryItems && inventoryItems.length > 0 && (
            <Select onValueChange={addFromInventory}>
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-muted-foreground">Add from Inventory</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{item.name}</span>
                      {item.cost_per_unit && (
                        <span className="text-muted-foreground text-sm">
                          ${item.cost_per_unit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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
