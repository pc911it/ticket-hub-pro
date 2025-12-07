import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, ShoppingCart, Package, Truck, CheckCircle, 
  Clock, Edit, Trash2, Eye, ArrowLeft, Mail
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface InventoryItem {
  id: string;
  name: string;
  quantity_in_stock: number;
  minimum_stock: number | null;
  cost_per_unit: number | null;
  supplier: string | null;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: string | null;
  status: string;
  notes: string | null;
  expected_delivery_date: string | null;
  total_cost: number | null;
  created_at: string;
  items_count?: number;
}

interface OrderItem {
  id: string;
  inventory_item_id: string;
  quantity_ordered: number;
  unit_cost: number | null;
  quantity_received: number;
  inventory_items?: { name: string; unit: string | null } | null;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  { value: 'submitted', label: 'Submitted', color: 'bg-info/10 text-info', icon: ShoppingCart },
  { value: 'ordered', label: 'Ordered', color: 'bg-warning/10 text-warning', icon: Package },
  { value: 'shipped', label: 'Shipped', color: 'bg-primary/10 text-primary', icon: Truck },
  { value: 'received', label: 'Received', color: 'bg-success/10 text-success', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-destructive/10 text-destructive', icon: Clock },
];

const PurchaseOrdersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    supplierEmail: '',
    notes: '',
    expected_delivery_date: '',
  });
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number; unitCost: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Get company
    const { data: memberData } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberData) {
      setCompanyId(memberData.company_id);

      // Get company name
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', memberData.company_id)
        .single();
      
      if (companyData) setCompanyName(companyData.name);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('company_id', memberData.company_id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        // Get item counts
        const orderIds = ordersData.map(o => o.id);
        const { data: itemsData } = await supabase
          .from('purchase_order_items')
          .select('purchase_order_id')
          .in('purchase_order_id', orderIds);

        const countsMap: Record<string, number> = {};
        itemsData?.forEach(item => {
          countsMap[item.purchase_order_id] = (countsMap[item.purchase_order_id] || 0) + 1;
        });

        setOrders(ordersData.map(o => ({ ...o, items_count: countsMap[o.id] || 0 })));
      }

      // Fetch inventory for suggestions
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('id, name, quantity_in_stock, minimum_stock, cost_per_unit, supplier')
        .eq('company_id', memberData.company_id)
        .order('name');

      if (invData) setInventory(invData);
    }

    setLoading(false);
  };

  const getLowStockItems = () => {
    return inventory.filter(i => i.minimum_stock && i.quantity_in_stock <= i.minimum_stock);
  };

  const generateOrderNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PO-${date}-${random}`;
  };

  const addItemToOrder = (itemId: string) => {
    if (selectedItems.some(i => i.itemId === itemId)) return;
    const item = inventory.find(i => i.id === itemId);
    const suggestedQty = item?.minimum_stock 
      ? Math.max(1, (item.minimum_stock * 2) - item.quantity_in_stock)
      : 10;
    
    setSelectedItems([
      ...selectedItems,
      { itemId, quantity: suggestedQty, unitCost: item?.cost_per_unit || 0 },
    ]);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(i => 
      i.itemId === itemId ? { ...i, quantity } : i
    ));
  };

  const removeItemFromOrder = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const createOrder = async () => {
    if (!companyId || selectedItems.length === 0) return;

    const orderNumber = generateOrderNumber();
    const totalCost = calculateTotal();

    const { data: orderData, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        company_id: companyId,
        order_number: orderNumber,
        supplier: formData.supplier || null,
        notes: formData.notes || null,
        expected_delivery_date: formData.expected_delivery_date || null,
        total_cost: totalCost,
        status: 'draft',
        created_by: user?.id,
      })
      .select('id')
      .single();

    if (orderError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create order.' });
      return;
    }

    // Insert items
    const itemsToInsert = selectedItems.map(item => ({
      purchase_order_id: orderData.id,
      inventory_item_id: item.itemId,
      quantity_ordered: item.quantity,
      unit_cost: item.unitCost,
    }));

    await supabase.from('purchase_order_items').insert(itemsToInsert);

    toast({ title: 'Success', description: `Purchase order ${orderNumber} created.` });
    setIsCreateOpen(false);
    resetForm();
    fetchData();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
      return;
    }

    // Send email when order is submitted
    if (newStatus === 'submitted' && selectedOrder) {
      await sendSupplierEmail(selectedOrder, orderItems);
    }

    // If received, update inventory
    if (newStatus === 'received') {
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('inventory_item_id, quantity_ordered')
        .eq('purchase_order_id', orderId);

      if (items) {
        for (const item of items) {
          const { data: currentItem } = await supabase
            .from('inventory_items')
            .select('quantity_in_stock')
            .eq('id', item.inventory_item_id)
            .single();

          if (currentItem) {
            await supabase
              .from('inventory_items')
              .update({ quantity_in_stock: currentItem.quantity_in_stock + item.quantity_ordered })
              .eq('id', item.inventory_item_id);
          }

          await supabase
            .from('purchase_order_items')
            .update({ quantity_received: item.quantity_ordered })
            .eq('purchase_order_id', orderId)
            .eq('inventory_item_id', item.inventory_item_id);
        }
      }
    }

    toast({ title: 'Success', description: 'Order status updated.' });
    fetchData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete order.' });
      return;
    }

    toast({ title: 'Success', description: 'Order deleted.' });
    setIsViewOpen(false);
    fetchData();
  };

  const viewOrder = async (order: PurchaseOrder) => {
    setSelectedOrder(order);

    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*, inventory_items(name, unit)')
      .eq('purchase_order_id', order.id);

    if (items) setOrderItems(items);
    setIsViewOpen(true);
  };

  const resetForm = () => {
    setFormData({ supplier: '', supplierEmail: '', notes: '', expected_delivery_date: '' });
    setSelectedItems([]);
  };

  const sendSupplierEmail = async (order: PurchaseOrder, items: OrderItem[]) => {
    // Check if we have a supplier email - for now we'll use the supplier name as email hint
    // In a real app, you'd have supplier emails stored in a suppliers table
    if (!order.supplier) {
      toast({ title: 'Note', description: 'No supplier specified - email not sent.' });
      return;
    }

    // You can customize this to look up supplier email from a suppliers table
    // For demo, we'll prompt if there's no email format
    const emailItems = items.map(item => ({
      name: item.inventory_items?.name || 'Unknown Item',
      quantity: item.quantity_ordered,
      unitCost: item.unit_cost || 0,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('send-purchase-order-email', {
        body: {
          to: order.supplier.includes('@') ? order.supplier : `orders@${order.supplier.toLowerCase().replace(/\s+/g, '')}.com`,
          supplierName: order.supplier,
          orderNumber: order.order_number,
          companyName: companyName || 'Our Company',
          items: emailItems,
          totalCost: order.total_cost || 0,
          expectedDeliveryDate: order.expected_delivery_date 
            ? format(new Date(order.expected_delivery_date), 'MMMM d, yyyy')
            : undefined,
          notes: order.notes || undefined,
        },
      });

      if (error) throw error;

      toast({ title: 'Email Sent', description: `Order notification sent to ${order.supplier}.` });
    } catch (err: any) {
      console.error('Email error:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Email Failed', 
        description: 'Order submitted but email notification failed.' 
      });
    }
  };

  const openCreateWithSuggestions = () => {
    const lowStock = getLowStockItems();
    const suggested = lowStock.map(item => ({
      itemId: item.id,
      quantity: Math.max(1, (item.minimum_stock! * 2) - item.quantity_in_stock),
      unitCost: item.cost_per_unit || 0,
    }));
    setSelectedItems(suggested);
    
    // Set supplier from first low stock item
    const firstSupplier = lowStock.find(i => i.supplier)?.supplier;
    if (firstSupplier) {
      setFormData({ ...formData, supplier: firstSupplier });
    }
    
    setIsCreateOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
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
          <h1 className="text-3xl font-display font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Create and track inventory restock orders.</p>
        </div>
        <div className="flex gap-2">
          {getLowStockItems().length > 0 && (
            <Button variant="outline" onClick={openCreateWithSuggestions}>
              <Package className="h-4 w-4 mr-2" />
              Restock Low Items ({getLowStockItems().length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'draft').length}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => ['submitted', 'ordered'].includes(o.status)).length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'shipped').length}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'received').length}</p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
            {statusOptions.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No orders found matching your filters.' 
                : 'No purchase orders yet. Create your first order!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.supplier || '-'}</TableCell>
                      <TableCell>{order.items_count} items</TableCell>
                      <TableCell>${order.total_cost?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', statusInfo.color)}>
                          <statusInfo.icon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => viewOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => deleteOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Create Purchase Order</DialogTitle>
            <DialogDescription>Add items and submit an order to restock inventory.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Items</Label>
              <Select onValueChange={addItemToOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item to add" />
                </SelectTrigger>
                <SelectContent>
                  {inventory
                    .filter(i => !selectedItems.some(s => s.itemId === i.id))
                    .map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (Stock: {item.quantity_in_stock})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-28">Unit Cost</TableHead>
                      <TableHead className="w-24">Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map(item => {
                      const invItem = inventory.find(i => i.id === item.itemId);
                      return (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-medium">{invItem?.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.itemId, parseInt(e.target.value) || 1)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => {
                                const newCost = parseFloat(e.target.value) || 0;
                                setSelectedItems(selectedItems.map(i => 
                                  i.itemId === item.itemId ? { ...i, unitCost: newCost } : i
                                ));
                              }}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>${(item.quantity * item.unitCost).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeItemFromOrder(item.itemId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="p-3 bg-muted/50 flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={createOrder} disabled={selectedItems.length === 0}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={cn('mt-1', getStatusInfo(selectedOrder.status).color)}>
                    {getStatusInfo(selectedOrder.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedOrder.supplier || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {selectedOrder.expected_delivery_date 
                      ? format(new Date(selectedOrder.expected_delivery_date), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.inventory_items?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right">{item.quantity_received}</TableCell>
                        <TableCell className="text-right">${item.unit_cost?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right">
                          ${((item.unit_cost || 0) * item.quantity_ordered).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 bg-muted/50 flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">${selectedOrder.total_cost?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              {/* Status Actions */}
              {selectedOrder.status !== 'received' && selectedOrder.status !== 'cancelled' && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <p className="text-sm text-muted-foreground w-full mb-2">Update Status:</p>
                  {statusOptions
                    .filter(s => {
                      const currentIdx = statusOptions.findIndex(o => o.value === selectedOrder.status);
                      const thisIdx = statusOptions.findIndex(o => o.value === s.value);
                      return thisIdx > currentIdx && s.value !== 'cancelled';
                    })
                    .map(status => (
                      <Button
                        key={status.value}
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                        className="gap-1"
                      >
                        <status.icon className="h-4 w-4" />
                        Mark as {status.label}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  >
                    Cancel Order
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrdersPage;
