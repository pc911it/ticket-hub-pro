import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, MapPin, Package } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  company_id: string | null;
}

export default function SuppliersPage() {
  const { user, isCompanyOwner, isSuperAdmin } = useAuth();
  const canDelete = isCompanyOwner || isSuperAdmin;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // Get user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company-suppliers", user?.id],
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

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!userCompany?.company_id,
  });

  // Get inventory items count per supplier
  const { data: inventoryBySupplier } = useQuery({
    queryKey: ["inventory-by-supplier", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return {};
      const { data, error } = await supabase
        .from("inventory_items")
        .select("supplier_id")
        .eq("company_id", userCompany.company_id)
        .not("supplier_id", "is", null);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        if (item.supplier_id) {
          counts[item.supplier_id] = (counts[item.supplier_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!userCompany?.company_id,
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplier: typeof newSupplier) => {
      if (!userCompany?.company_id) throw new Error("No company found");
      const { error } = await supabase.from("suppliers").insert({
        ...supplier,
        company_id: userCompany.company_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier added successfully");
      setIsAddOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: supplier.name,
          contact_name: supplier.contact_name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          notes: supplier.notes,
        })
        .eq("id", supplier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier updated");
      setEditingSupplier(null);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setNewSupplier({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  };

  const filteredSuppliers = suppliers?.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your inventory suppliers and contacts</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Supplier</DialogTitle>
              <DialogDescription>Add a new supplier to your inventory system</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSupplierMutation.mutate(newSupplier);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="ABC Supplies Inc."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={newSupplier.contact_name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    placeholder="123 Main St, City, ST"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                  placeholder="Additional notes about this supplier..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addSupplierMutation.isPending}>
                  {addSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">registered suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers?.filter((s) => s.email).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">contactable by email</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers?.filter((s) => s.phone).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">contactable by phone</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading suppliers...</div>
          ) : filteredSuppliers?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No suppliers found. Add your first supplier to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers?.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.address && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.contact_name || "-"}</TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                          {supplier.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">
                          {supplier.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {inventoryBySupplier?.[supplier.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSupplier(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Delete this supplier?")) {
                                deleteSupplierMutation.mutate(supplier.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier information</DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSupplierMutation.mutate(editingSupplier);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={editingSupplier.name}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={editingSupplier.contact_name || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, contact_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingSupplier.email || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editingSupplier.phone || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={editingSupplier.address || ""}
                    onChange={(e) =>
                      setEditingSupplier({ ...editingSupplier, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingSupplier.notes || ""}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSupplierMutation.isPending}>
                  {updateSupplierMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
