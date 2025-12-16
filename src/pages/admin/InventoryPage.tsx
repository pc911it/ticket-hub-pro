import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Package, Plus, AlertTriangle, TrendingDown, TrendingUp, Wrench, Search, Edit, Trash2, BarChart3, ShoppingCart, QrCode, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";

const categories = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "Fire Safety",
  "Security",
  "General",
  "Tools",
  "Other",
];

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  quantity_in_stock: number;
  minimum_stock: number | null;
  cost_per_unit: number | null;
  supplier: string | null;
  company_id: string | null;
  barcode: string | null;
  supplier_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const { user, isCompanyOwner, isSuperAdmin } = useAuth();
  const canDelete = isCompanyOwner || isSuperAdmin;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<"search" | "add" | "edit">("search");
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    sku: "",
    category: "General",
    unit: "unit",
    quantity_in_stock: 0,
    minimum_stock: 5,
    cost_per_unit: 0,
    supplier: "",
    barcode: "",
    supplier_id: "",
  });

  // Get user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company-inventory", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, suppliers(id, name)")
        .eq("company_id", userCompany.company_id)
        .order("name");
      if (error) throw error;
      return data as (InventoryItem & { suppliers: Supplier | null })[];
    },
    enabled: !!userCompany?.company_id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", userCompany.company_id)
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!userCompany?.company_id,
  });

  const { data: recentUsage } = useQuery({
    queryKey: ["inventory-usage-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_usage")
        .select(`
          *,
          inventory_items(name, unit),
          tickets(title)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      const { error } = await supabase.from("inventory_items").insert({
        name: item.name,
        description: item.description || null,
        sku: item.sku || null,
        category: item.category,
        unit: item.unit,
        quantity_in_stock: item.quantity_in_stock,
        minimum_stock: item.minimum_stock,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier || null,
        barcode: item.barcode || null,
        supplier_id: item.supplier_id || null,
        company_id: userCompany.company_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added to inventory");
      setIsAddOpen(false);
      setNewItem({
        name: "",
        description: "",
        sku: "",
        category: "General",
        unit: "unit",
        quantity_in_stock: 0,
        minimum_stock: 5,
        cost_per_unit: 0,
        supplier: "",
        barcode: "",
        supplier_id: "",
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: item.name,
          description: item.description,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          quantity_in_stock: item.quantity_in_stock,
          minimum_stock: item.minimum_stock,
          cost_per_unit: item.cost_per_unit,
          supplier: item.supplier,
          barcode: item.barcode,
          supplier_id: item.supplier_id,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item updated");
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleBarcodeScan = (barcode: string) => {
    if (scanMode === "search") {
      // Search for item with this barcode
      const found = items?.find((item) => item.barcode === barcode);
      if (found) {
        setSearchQuery(barcode);
        toast.success(`Found: ${found.name}`);
      } else {
        toast.info("No item found with this barcode");
      }
    } else if (scanMode === "add") {
      setNewItem({ ...newItem, barcode });
      toast.success("Barcode scanned");
    } else if (scanMode === "edit" && editingItem) {
      setEditingItem({ ...editingItem, barcode });
      toast.success("Barcode scanned");
    }
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredItems = items?.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items?.filter(
    (item) => item.minimum_stock && item.quantity_in_stock <= item.minimum_stock
  );

  const totalValue = items?.reduce(
    (sum, item) => sum + (item.cost_per_unit || 0) * item.quantity_in_stock,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Track materials and supplies for job sites</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/inventory/suppliers">
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Suppliers
            </Button>
          </Link>
          <Link to="/admin/inventory/orders">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Orders
            </Button>
          </Link>
          <Link to="/admin/inventory/reports">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setScanMode("search");
              setIsScannerOpen(true);
            }}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Add a new item to your inventory</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addItemMutation.mutate(newItem);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Smoke Detector"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="SD-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Ionization smoke detector with battery backup"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="roll">Roll</SelectItem>
                      <SelectItem value="ft">Feet</SelectItem>
                      <SelectItem value="meter">Meter</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="lb">Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>In Stock *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.quantity_in_stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, quantity_in_stock: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.minimum_stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minimum_stock: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost/Unit ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.cost_per_unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, cost_per_unit: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem.barcode}
                      onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                      placeholder="Scan or enter barcode"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setScanMode("add");
                        setIsScannerOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select
                    value={newItem.supplier_id || "none"}
                    onValueChange={(value) => setNewItem({ ...newItem, supplier_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="none">No supplier</SelectItem>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
            <p className="text-xs text-muted-foreground">unique items in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">inventory value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems?.length || 0}</div>
            <p className="text-xs text-muted-foreground">items need restock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(items?.map((i) => i.category)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">item categories</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="usage">Recent Usage</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading inventory...</div>
              ) : filteredItems?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No items found. Add your first inventory item to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems?.map((item) => {
                      const isLowStock =
                        item.minimum_stock && item.quantity_in_stock <= item.minimum_stock;
                      const stockPercentage = item.minimum_stock
                        ? Math.min((item.quantity_in_stock / (item.minimum_stock * 2)) * 100, 100)
                        : 100;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.sku && `SKU: ${item.sku}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">
                                {item.quantity_in_stock} {item.unit}
                              </p>
                              <Progress value={stockPercentage} className="h-1.5 w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <TrendingDown className="h-3 w-3" />
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell>${item.cost_per_unit?.toFixed(2) || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Items
              </CardTitle>
              <CardDescription>Items that need to be restocked</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  All items are well stocked!
                </p>
              ) : (
                <div className="space-y-4">
                  {lowStockItems?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity_in_stock} {item.unit} remaining (min: {item.minimum_stock})
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Restock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Recent Usage</CardTitle>
              <CardDescription>Materials used in recent jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsage?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No usage recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {recentUsage?.map((usage: any) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{usage.inventory_items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Used in: {usage.tickets?.title || "Unknown ticket"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={usage.usage_type === "used" ? "default" : "secondary"}>
                          {usage.quantity_used} {usage.inventory_items?.unit}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(usage.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update inventory item details</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateItemMutation.mutate(editingItem);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={editingItem.sku || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>In Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingItem.quantity_in_stock}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        quantity_in_stock: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingItem.minimum_stock || 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        minimum_stock: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost/Unit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingItem.cost_per_unit || 0}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        cost_per_unit: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editingItem.barcode || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                      placeholder="Scan or enter barcode"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setScanMode("edit");
                        setIsScannerOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select
                    value={editingItem.supplier_id || "none"}
                    onValueChange={(value) => setEditingItem({ ...editingItem, supplier_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="none">No supplier</SelectItem>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateItemMutation.isPending}>
                  {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}
