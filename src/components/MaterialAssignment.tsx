import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  quantity_in_stock: number;
  unit: string | null;
  minimum_stock: number | null;
}

export interface MaterialAssignmentItem {
  inventory_item_id: string;
  quantity_planned: number;
  name?: string;
  unit?: string | null;
  available?: number;
}

interface MaterialAssignmentProps {
  value: MaterialAssignmentItem[];
  onChange: (items: MaterialAssignmentItem[]) => void;
  disabled?: boolean;
}

export function MaterialAssignment({ value, onChange, disabled }: MaterialAssignmentProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, name, quantity_in_stock, unit, minimum_stock')
      .gt('quantity_in_stock', 0)
      .order('name');

    if (data) setInventory(data);
    setLoading(false);
  };

  const addMaterial = () => {
    if (inventory.length === 0) return;
    const availableItems = inventory.filter(
      item => !value.some(v => v.inventory_item_id === item.id)
    );
    if (availableItems.length === 0) return;

    const firstAvailable = availableItems[0];
    onChange([
      ...value,
      {
        inventory_item_id: firstAvailable.id,
        quantity_planned: 1,
        name: firstAvailable.name,
        unit: firstAvailable.unit,
        available: firstAvailable.quantity_in_stock,
      },
    ]);
  };

  const updateMaterial = (index: number, field: keyof MaterialAssignmentItem, newValue: string | number) => {
    const updated = [...value];
    if (field === 'inventory_item_id') {
      const item = inventory.find(i => i.id === newValue);
      updated[index] = {
        ...updated[index],
        inventory_item_id: newValue as string,
        name: item?.name,
        unit: item?.unit,
        available: item?.quantity_in_stock,
        quantity_planned: 1,
      };
    } else {
      updated[index] = { ...updated[index], [field]: newValue };
    }
    onChange(updated);
  };

  const removeMaterial = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getAvailableItems = (currentItemId?: string) => {
    return inventory.filter(
      item => item.id === currentItemId || !value.some(v => v.inventory_item_id === item.id)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materials
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMaterial}
            disabled={disabled || inventory.length === 0 || value.length >= inventory.length}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {inventory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No inventory items available
          </p>
        ) : value.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No materials assigned
          </p>
        ) : (
          value.map((item, index) => {
            const inventoryItem = inventory.find(i => i.id === item.inventory_item_id);
            const maxQuantity = inventoryItem?.quantity_in_stock || 0;
            const isOverStock = item.quantity_planned > maxQuantity;

            return (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <Select
                    value={item.inventory_item_id}
                    onValueChange={(val) => updateMaterial(index, 'inventory_item_id', val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableItems(item.inventory_item_id).map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex items-center gap-2">
                            <span>{inv.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {inv.quantity_in_stock} {inv.unit || 'units'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={item.quantity_planned}
                    onChange={(e) => updateMaterial(index, 'quantity_planned', parseInt(e.target.value) || 1)}
                    disabled={disabled}
                    className={cn(
                      "h-8 text-sm",
                      isOverStock && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12">
                  {inventoryItem?.unit || 'units'}
                </span>
                {isOverStock && (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeMaterial(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export async function saveInventoryUsage(
  ticketId: string,
  materials: MaterialAssignmentItem[],
  agentId?: string
) {
  if (materials.length === 0) return { error: null };

  // Insert usage records
  const usageRecords = materials.map(m => ({
    ticket_id: ticketId,
    inventory_item_id: m.inventory_item_id,
    quantity_planned: m.quantity_planned,
    quantity_used: m.quantity_planned,
    agent_id: agentId || null,
    usage_type: 'planned',
  }));

  const { error: usageError } = await supabase
    .from('inventory_usage')
    .insert(usageRecords);

  if (usageError) return { error: usageError };

  // Deduct from inventory
  for (const material of materials) {
    const { data: currentItem } = await supabase
      .from('inventory_items')
      .select('quantity_in_stock')
      .eq('id', material.inventory_item_id)
      .single();

    if (currentItem) {
      const newQuantity = Math.max(0, currentItem.quantity_in_stock - material.quantity_planned);
      await supabase
        .from('inventory_items')
        .update({ quantity_in_stock: newQuantity })
        .eq('id', material.inventory_item_id);
    }
  }

  return { error: null };
}
