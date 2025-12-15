import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, Ticket, FolderKanban, Package, Clock, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";

interface PlatformStats {
  totalCompanies: number;
  pendingApprovals: number;
  activeCompanies: number;
  trialCompanies: number;
  totalUsers: number;
  totalTickets: number;
  completedTickets: number;
  pendingTickets: number;
  totalProjects: number;
  activeProjects: number;
  totalInventoryItems: number;
  lowStockItems: number;
}

interface RecentCompany {
  id: string;
  name: string;
  email: string;
  approval_status: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteCompany, setDeleteCompany] = useState<RecentCompany | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        companiesRes,
        usersRes,
        ticketsRes,
        projectsRes,
        inventoryRes,
        recentCompaniesRes
      ] = await Promise.all([
        supabase.from('companies').select('id, approval_status, subscription_status, is_active'),
        supabase.from('profiles').select('id'),
        supabase.from('tickets').select('id, status'),
        supabase.from('projects').select('id, status'),
        supabase.from('inventory_items').select('id, quantity_in_stock, minimum_stock'),
        supabase.from('companies').select('id, name, email, approval_status, subscription_status, subscription_plan, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(10)
      ]);

      const companies = companiesRes.data || [];
      const users = usersRes.data || [];
      const tickets = ticketsRes.data || [];
      const projects = projectsRes.data || [];
      const inventory = inventoryRes.data || [];

      setStats({
        totalCompanies: companies.length,
        pendingApprovals: companies.filter(c => c.approval_status === 'pending').length,
        activeCompanies: companies.filter(c => c.is_active && c.approval_status === 'approved').length,
        trialCompanies: companies.filter(c => c.subscription_status === 'trial').length,
        totalUsers: users.length,
        totalTickets: tickets.length,
        completedTickets: tickets.filter(t => t.status === 'completed').length,
        pendingTickets: tickets.filter(t => t.status === 'pending').length,
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalInventoryItems: inventory.length,
        lowStockItems: inventory.filter(i => i.quantity_in_stock <= (i.minimum_stock || 0)).length,
      });

      setRecentCompanies(recentCompaniesRes.data || []);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompany) return;
    
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-company', {
        body: { 
          company_id: deleteCompany.id,
          reason: "Super Admin deletion"
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        toast.success("Company deleted", {
          description: result.fee_charged 
            ? `${deleteCompany.name} has been deleted. A $${result.fee_amount} cancellation fee was charged.`
            : `${deleteCompany.name} has been deleted. ${result.charge_error || ''}`
        });
        fetchPlatformStats();
      } else {
        throw new Error(result.error || "Failed to delete company");
      }
    } catch (error: any) {
      toast.error("Failed to delete company", {
        description: error.message
      });
    } finally {
      setIsDeleting(false);
      setDeleteCompany(null);
      setDeleteConfirmText("");
    }
  };

  const getCancellationFee = (plan: string | null) => {
    switch (plan) {
      case 'enterprise': return 199;
      case 'professional': return 79;
      default: return 29;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform-wide statistics and overview</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide statistics and overview</p>
      </div>

      {/* Company Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Companies</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats?.pendingApprovals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.activeCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Trial</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.trialCompanies}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Users & Tickets Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Users & Tickets</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.completedTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats?.pendingTickets}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects & Inventory Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Projects & Inventory</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.activeProjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInventoryItems}</div>
            </CardContent>
          </Card>

          <Card className={stats?.lowStockItems ? "border-red-500/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.lowStockItems}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Companies</CardTitle>
          <CardDescription>Latest company registrations - Click delete to remove a company with cancellation fee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCompanies.map((company) => (
              <div key={company.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(company.approval_status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteCompany(company)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {recentCompanies.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No companies registered yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Company Confirmation Dialog */}
      <AlertDialog open={!!deleteCompany} onOpenChange={(open) => !open && setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Company
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete <strong>{deleteCompany?.name}</strong> and remove all associated data.
              </p>
              <p className="text-destructive font-medium">
                A cancellation fee of ${getCancellationFee(deleteCompany?.subscription_plan || null)} will be charged to their payment method.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-delete-admin">
                  Type <strong>{deleteCompany?.name}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-delete-admin"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter company name"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== deleteCompany?.name || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCompany();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
