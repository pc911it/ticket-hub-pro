import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RotateCcw, AlertTriangle, Building2, Ticket, Users, Clock, Package, Store, Ship, Settings2 } from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

interface DeletedProject {
  id: string;
  name: string;
  deleted_at: string;
}

interface DeletedTicket {
  id: string;
  title: string;
  deleted_at: string;
  clients: { full_name: string } | null;
}

interface DeletedClient {
  id: string;
  full_name: string;
  email: string;
  deleted_at: string;
}

interface DeletedInventoryItem {
  id: string;
  name: string;
  sku: string | null;
  deleted_at: string;
}

interface DeletedSupplier {
  id: string;
  name: string;
  email: string | null;
  deleted_at: string;
}

interface DeletedVessel {
  id: string;
  boat_name: string;
  hull_id: string | null;
  deleted_at: string;
}

interface DeletedServiceType {
  id: string;
  name: string;
  deleted_at: string;
}

const TrashPage = () => {
  const { isCompanyOwner, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canPermanentlyDelete = isCompanyOwner || isSuperAdmin || isCompanyAdmin;
  
  const [deletedProjects, setDeletedProjects] = useState<DeletedProject[]>([]);
  const [deletedTickets, setDeletedTickets] = useState<DeletedTicket[]>([]);
  const [deletedClients, setDeletedClients] = useState<DeletedClient[]>([]);
  const [deletedInventory, setDeletedInventory] = useState<DeletedInventoryItem[]>([]);
  const [deletedSuppliers, setDeletedSuppliers] = useState<DeletedSupplier[]>([]);
  const [deletedVessels, setDeletedVessels] = useState<DeletedVessel[]>([]);
  const [deletedServiceTypes, setDeletedServiceTypes] = useState<DeletedServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedInventory, setSelectedInventory] = useState<Set<string>>(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [selectedVessels, setSelectedVessels] = useState<Set<string>>(new Set());
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<{ type: 'project' | 'ticket' | 'client' | 'inventory' | 'supplier' | 'vessel' | 'servicetype'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    const [{ data: projects }, { data: tickets }, { data: clients }, { data: inventory }, { data: suppliers }, { data: vessels }, { data: serviceTypes }] = await Promise.all([
      supabase.from('projects').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('tickets').select('id, title, deleted_at, clients(full_name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('clients').select('id, full_name, email, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('inventory_items').select('id, name, sku, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('suppliers').select('id, name, email, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('vessels').select('id, boat_name, hull_id, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('company_service_types').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    ]);

    if (projects) setDeletedProjects(projects);
    if (tickets) setDeletedTickets(tickets);
    if (clients) setDeletedClients(clients);
    if (inventory) setDeletedInventory(inventory);
    if (suppliers) setDeletedSuppliers(suppliers);
    if (vessels) setDeletedVessels(vessels);
    if (serviceTypes) setDeletedServiceTypes(serviceTypes);
    setLoading(false);
  };

  const handleRestore = async (type: 'project' | 'ticket' | 'client' | 'inventory' | 'supplier' | 'vessel' | 'servicetype', ids: string[]) => {
    setRestoring(true);
    const tableMap: Record<typeof type, string> = {
      project: 'projects',
      ticket: 'tickets', 
      client: 'clients',
      inventory: 'inventory_items',
      supplier: 'suppliers',
      vessel: 'vessels',
      servicetype: 'company_service_types'
    };
    const table = tableMap[type];
    
    const { error } = await supabase
      .from(table as any)
      .update({ deleted_at: null })
      .in('id', ids);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to restore ${type}(s).` });
    } else {
      toast({ title: 'Restored', description: `${ids.length} ${type}(s) restored successfully.` });
      fetchDeletedItems();
      if (type === 'project') setSelectedProjects(new Set());
      if (type === 'ticket') setSelectedTickets(new Set());
      if (type === 'client') setSelectedClients(new Set());
      if (type === 'inventory') setSelectedInventory(new Set());
      if (type === 'supplier') setSelectedSuppliers(new Set());
      if (type === 'vessel') setSelectedVessels(new Set());
      if (type === 'servicetype') setSelectedServiceTypes(new Set());
    }
    setRestoring(false);
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteItem) return;
    setDeleting(true);
    
    const tableMap: Record<typeof permanentDeleteItem.type, string> = {
      project: 'projects',
      ticket: 'tickets', 
      client: 'clients',
      inventory: 'inventory_items',
      supplier: 'suppliers',
      vessel: 'vessels',
      servicetype: 'company_service_types'
    };
    const table = tableMap[permanentDeleteItem.type];
    
    const { error } = await supabase.from(table as any).delete().eq('id', permanentDeleteItem.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to permanently delete item.' });
    } else {
      toast({ title: 'Deleted', description: 'Item permanently deleted.' });
      fetchDeletedItems();
    }
    setDeleting(false);
    setPermanentDeleteItem(null);
  };

  const handleBulkPermanentDelete = async (type: 'project' | 'ticket' | 'client' | 'inventory' | 'supplier' | 'vessel' | 'servicetype', ids: string[]) => {
    setDeleting(true);
    const tableMap: Record<typeof type, string> = {
      project: 'projects',
      ticket: 'tickets', 
      client: 'clients',
      inventory: 'inventory_items',
      supplier: 'suppliers',
      vessel: 'vessels',
      servicetype: 'company_service_types'
    };
    const table = tableMap[type];
    
    const { error } = await supabase.from(table as any).delete().in('id', ids);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to permanently delete ${type}(s).` });
    } else {
      toast({ title: 'Deleted', description: `${ids.length} ${type}(s) permanently deleted.` });
      fetchDeletedItems();
      if (type === 'project') setSelectedProjects(new Set());
      if (type === 'ticket') setSelectedTickets(new Set());
      if (type === 'client') setSelectedClients(new Set());
      if (type === 'inventory') setSelectedInventory(new Set());
      if (type === 'supplier') setSelectedSuppliers(new Set());
      if (type === 'vessel') setSelectedVessels(new Set());
      if (type === 'servicetype') setSelectedServiceTypes(new Set());
    }
    setDeleting(false);
  };

  const toggleSelection = (type: 'project' | 'ticket' | 'client' | 'inventory' | 'supplier' | 'vessel' | 'servicetype', id: string) => {
    const setterMap: Record<typeof type, React.Dispatch<React.SetStateAction<Set<string>>>> = {
      project: setSelectedProjects,
      ticket: setSelectedTickets,
      client: setSelectedClients,
      inventory: setSelectedInventory,
      supplier: setSelectedSuppliers,
      vessel: setSelectedVessels,
      servicetype: setSelectedServiceTypes
    };
    const setter = setterMap[type];
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (type: 'project' | 'ticket' | 'client' | 'inventory' | 'supplier' | 'vessel' | 'servicetype') => {
    if (type === 'project') {
      if (selectedProjects.size === deletedProjects.length) {
        setSelectedProjects(new Set());
      } else {
        setSelectedProjects(new Set(deletedProjects.map(p => p.id)));
      }
    } else if (type === 'ticket') {
      if (selectedTickets.size === deletedTickets.length) {
        setSelectedTickets(new Set());
      } else {
        setSelectedTickets(new Set(deletedTickets.map(t => t.id)));
      }
    } else if (type === 'client') {
      if (selectedClients.size === deletedClients.length) {
        setSelectedClients(new Set());
      } else {
        setSelectedClients(new Set(deletedClients.map(c => c.id)));
      }
    } else if (type === 'inventory') {
      if (selectedInventory.size === deletedInventory.length) {
        setSelectedInventory(new Set());
      } else {
        setSelectedInventory(new Set(deletedInventory.map(i => i.id)));
      }
    } else if (type === 'supplier') {
      if (selectedSuppliers.size === deletedSuppliers.length) {
        setSelectedSuppliers(new Set());
      } else {
        setSelectedSuppliers(new Set(deletedSuppliers.map(s => s.id)));
      }
    } else if (type === 'vessel') {
      if (selectedVessels.size === deletedVessels.length) {
        setSelectedVessels(new Set());
      } else {
        setSelectedVessels(new Set(deletedVessels.map(v => v.id)));
      }
    } else if (type === 'servicetype') {
      if (selectedServiceTypes.size === deletedServiceTypes.length) {
        setSelectedServiceTypes(new Set());
      } else {
        setSelectedServiceTypes(new Set(deletedServiceTypes.map(s => s.id)));
      }
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const purgeDate = addDays(new Date(deletedAt), 30);
    const now = new Date();
    const diffTime = purgeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const totalDeletedItems = deletedProjects.length + deletedTickets.length + deletedClients.length + deletedInventory.length + deletedSuppliers.length + deletedVessels.length + deletedServiceTypes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Trash2 className="h-8 w-8" />
          Trash
        </h1>
        <p className="text-muted-foreground mt-1">
          Deleted items are kept for 30 days before being permanently removed.
        </p>
      </div>

      {totalDeletedItems === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Trash is empty.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects" className="gap-2">
              <Building2 className="h-4 w-4" />
              Projects
              {deletedProjects.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedProjects.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
              {deletedTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedTickets.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              Clients
              {deletedClients.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedClients.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              Inventory
              {deletedInventory.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedInventory.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Store className="h-4 w-4" />
              Suppliers
              {deletedSuppliers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedSuppliers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vessels" className="gap-2">
              <Ship className="h-4 w-4" />
              Vessels
              {deletedVessels.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedVessels.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="servicetypes" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Service Types
              {deletedServiceTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">{deletedServiceTypes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {deletedProjects.length > 0 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAll('project')}
                >
                  {selectedProjects.size === deletedProjects.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedProjects.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleRestore('project', Array.from(selectedProjects))}
                      disabled={restoring}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedProjects.size})
                    </Button>
                    {canPermanentlyDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkPermanentDelete('project', Array.from(selectedProjects))}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever ({selectedProjects.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {deletedProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted projects.</p>
            ) : (
              <div className="space-y-2">
                {deletedProjects.map(project => (
                  <Card key={project.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox
                        checked={selectedProjects.has(project.id)}
                        onCheckedChange={() => toggleSelection('project', project.id)}
                      />
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Deleted {formatDistanceToNow(new Date(project.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(project.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore('project', [project.id])}
                          disabled={restoring}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPermanentDeleteItem({ type: 'project', id: project.id, name: project.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {deletedTickets.length > 0 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAll('ticket')}
                >
                  {selectedTickets.size === deletedTickets.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedTickets.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleRestore('ticket', Array.from(selectedTickets))}
                      disabled={restoring}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedTickets.size})
                    </Button>
                    {canPermanentlyDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkPermanentDelete('ticket', Array.from(selectedTickets))}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever ({selectedTickets.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {deletedTickets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted tickets.</p>
            ) : (
              <div className="space-y-2">
                {deletedTickets.map(ticket => (
                  <Card key={ticket.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox
                        checked={selectedTickets.has(ticket.id)}
                        onCheckedChange={() => toggleSelection('ticket', ticket.id)}
                      />
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ticket.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.clients?.full_name} • Deleted {formatDistanceToNow(new Date(ticket.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(ticket.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore('ticket', [ticket.id])}
                          disabled={restoring}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPermanentDeleteItem({ type: 'ticket', id: ticket.id, name: ticket.title })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            {deletedClients.length > 0 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAll('client')}
                >
                  {selectedClients.size === deletedClients.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedClients.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleRestore('client', Array.from(selectedClients))}
                      disabled={restoring}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedClients.size})
                    </Button>
                    {canPermanentlyDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkPermanentDelete('client', Array.from(selectedClients))}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever ({selectedClients.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {deletedClients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted clients.</p>
            ) : (
              <div className="space-y-2">
                {deletedClients.map(client => (
                  <Card key={client.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleSelection('client', client.id)}
                      />
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.email} • Deleted {formatDistanceToNow(new Date(client.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(client.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore('client', [client.id])}
                          disabled={restoring}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPermanentDeleteItem({ type: 'client', id: client.id, name: client.full_name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {deletedInventory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted inventory items.</p>
            ) : (
              <div className="space-y-2">
                {deletedInventory.map(item => (
                  <Card key={item.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.sku && `SKU: ${item.sku} • `}Deleted {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(item.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore('inventory', [item.id])} disabled={restoring}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPermanentDeleteItem({ type: 'inventory', id: item.id, name: item.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            {deletedSuppliers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted suppliers.</p>
            ) : (
              <div className="space-y-2">
                {deletedSuppliers.map(supplier => (
                  <Card key={supplier.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplier.email && `${supplier.email} • `}Deleted {formatDistanceToNow(new Date(supplier.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(supplier.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore('supplier', [supplier.id])} disabled={restoring}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPermanentDeleteItem({ type: 'supplier', id: supplier.id, name: supplier.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Vessels Tab */}
          <TabsContent value="vessels" className="space-y-4">
            {deletedVessels.length > 0 && (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => selectAll('vessel')}>
                  {selectedVessels.size === deletedVessels.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedVessels.size > 0 && (
                  <>
                    <Button size="sm" onClick={() => handleRestore('vessel', Array.from(selectedVessels))} disabled={restoring}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedVessels.size})
                    </Button>
                    {canPermanentlyDelete && (
                      <Button variant="destructive" size="sm" onClick={() => handleBulkPermanentDelete('vessel', Array.from(selectedVessels))} disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever ({selectedVessels.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {deletedVessels.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted vessels.</p>
            ) : (
              <div className="space-y-2">
                {deletedVessels.map(vessel => (
                  <Card key={vessel.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox checked={selectedVessels.has(vessel.id)} onCheckedChange={() => toggleSelection('vessel', vessel.id)} />
                      <Ship className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vessel.boat_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vessel.hull_id ? `Hull: ${vessel.hull_id} • ` : ''}
                          Deleted {formatDistanceToNow(new Date(vessel.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(vessel.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore('vessel', [vessel.id])} disabled={restoring}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPermanentDeleteItem({ type: 'vessel', id: vessel.id, name: vessel.boat_name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Service Types Tab */}
          <TabsContent value="servicetypes" className="space-y-4">
            {deletedServiceTypes.length > 0 && (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => selectAll('servicetype')}>
                  {selectedServiceTypes.size === deletedServiceTypes.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedServiceTypes.size > 0 && (
                  <>
                    <Button size="sm" onClick={() => handleRestore('servicetype', Array.from(selectedServiceTypes))} disabled={restoring}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore ({selectedServiceTypes.size})
                    </Button>
                    {canPermanentlyDelete && (
                      <Button variant="destructive" size="sm" onClick={() => handleBulkPermanentDelete('servicetype', Array.from(selectedServiceTypes))} disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever ({selectedServiceTypes.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {deletedServiceTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deleted service types.</p>
            ) : (
              <div className="space-y-2">
                {deletedServiceTypes.map(serviceType => (
                  <Card key={serviceType.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox checked={selectedServiceTypes.has(serviceType.id)} onCheckedChange={() => toggleSelection('servicetype', serviceType.id)} />
                      <Settings2 className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{serviceType.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Deleted {formatDistanceToNow(new Date(serviceType.deleted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(serviceType.deleted_at)} days left
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore('servicetype', [serviceType.id])} disabled={restoring}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {canPermanentlyDelete && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPermanentDeleteItem({ type: 'servicetype', id: serviceType.id, name: serviceType.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <DeleteConfirmationDialog
        open={!!permanentDeleteItem}
        onOpenChange={(open) => !open && setPermanentDeleteItem(null)}
        onConfirm={handlePermanentDelete}
        title={permanentDeleteItem?.type || 'Item'}
        itemName={permanentDeleteItem?.name || ''}
        itemType={permanentDeleteItem?.type || 'item'}
        description="This will permanently delete the item. This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
};

export default TrashPage;