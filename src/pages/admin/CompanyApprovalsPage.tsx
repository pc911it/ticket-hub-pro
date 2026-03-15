import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, CheckCircle, XCircle, Clock, Users, Mail, MapPin, Pencil, Send, Loader2, Trash2, Ban, Power, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  type: string;
  approval_status: string;
  created_at: string;
  owner_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
}

interface CompanyWithOwner extends Company {
  owner_email?: string;
  member_count?: number;
}

const companyTypes = [
  { value: 'alarm_company', label: 'Fire Alarm & Safety' },
  { value: 'tow_company', label: 'Tow Truck Services' },
  { value: 'electrician', label: 'Electrical Services' },
  { value: 'plumber', label: 'Plumbing Services' },
  { value: 'hvac', label: 'HVAC Services' },
  { value: 'security', label: 'Security Services' },
  { value: 'locksmith', label: 'Locksmith Services' },
  { value: 'boat_services', label: 'Boat & Marine Services' },
  { value: 'other', label: 'General Contractor / Other' },
];

export default function CompanyApprovalsPage() {
  const { isSuperAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const [editCompany, setEditCompany] = useState<CompanyWithOwner | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', type: '', approval_status: '',
  });
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CompanyWithOwner | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Disable confirmation state
  const [disableTarget, setDisableTarget] = useState<CompanyWithOwner | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["pending-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const companiesWithDetails: CompanyWithOwner[] = await Promise.all(
        (data || []).map(async (company) => {
          let owner_email: string | undefined;
          let member_count = 0;
          if (company.owner_id) {
            const { data: profile } = await supabase
              .from("profiles").select("email").eq("user_id", company.owner_id).maybeSingle();
            owner_email = profile?.email || undefined;
          }
          const { count } = await supabase
            .from("company_members").select("*", { count: "exact", head: true }).eq("company_id", company.id);
          member_count = count || 0;
          return { ...company, owner_email, member_count } as CompanyWithOwner;
        })
      );
      return companiesWithDetails;
    },
    enabled: isSuperAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc("approve_company", { _company_id: companyId });
      if (error) throw error;
      try { await supabase.functions.invoke("send-approval-email", { body: { company_id: companyId, status: "approved" } }); } catch {}
    },
    onSuccess: () => { toast.success("Company approved"); queryClient.invalidateQueries({ queryKey: ["pending-companies"] }); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc("reject_company", { _company_id: companyId });
      if (error) throw error;
      try { await supabase.functions.invoke("send-approval-email", { body: { company_id: companyId, status: "rejected" } }); } catch {}
    },
    onSuccess: () => { toast.success("Company rejected"); queryClient.invalidateQueries({ queryKey: ["pending-companies"] }); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ companyId, updates }: { companyId: string; updates: Record<string, any> }) => {
      const { approval_status, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        const { error } = await supabase.from("companies").update(otherUpdates).eq("id", companyId);
        if (error) throw error;
      }
      if (approval_status) {
        if (approval_status === 'approved') {
          const { error } = await supabase.rpc("approve_company", { _company_id: companyId });
          if (error) throw error;
        } else if (approval_status === 'rejected') {
          const { error } = await supabase.rpc("reject_company", { _company_id: companyId });
          if (error) throw error;
        } else if (approval_status === 'pending') {
          const { error } = await supabase.from("companies").update({ approval_status: 'pending' }).eq("id", companyId);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => { toast.success("Company updated"); queryClient.invalidateQueries({ queryKey: ["pending-companies"] }); setEditCompany(null); },
    onError: (error: Error) => { toast.error("Failed to update: " + error.message); },
  });

  const openEditDialog = (company: CompanyWithOwner) => {
    setEditCompany(company);
    setEditForm({
      name: company.name || '', email: company.email || '', phone: company.phone || '',
      address: company.address || '', city: company.city || '', state: company.state || '',
      type: company.type || 'other', approval_status: company.approval_status || 'pending',
    });
  };

  const handleSaveEdit = () => {
    if (!editCompany) return;
    const updates: Record<string, any> = {};
    if (editForm.name !== editCompany.name) updates.name = editForm.name;
    if (editForm.email !== editCompany.email) updates.email = editForm.email;
    if (editForm.phone !== (editCompany.phone || '')) updates.phone = editForm.phone || null;
    if (editForm.address !== (editCompany.address || '')) updates.address = editForm.address || null;
    if (editForm.city !== (editCompany.city || '')) updates.city = editForm.city || null;
    if (editForm.state !== (editCompany.state || '')) updates.state = editForm.state || null;
    if (editForm.type !== editCompany.type) updates.type = editForm.type;
    if (editForm.approval_status !== editCompany.approval_status) updates.approval_status = editForm.approval_status;
    if (Object.keys(updates).length === 0) { toast.info("No changes"); setEditCompany(null); return; }
    updateCompanyMutation.mutate({ companyId: editCompany.id, updates });
  };

  const handleResendWelcomeEmail = async (company: CompanyWithOwner) => {
    if (!company.owner_id || !company.owner_email) { toast.error("No owner email found"); return; }
    setResendingEmail(company.id);
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", company.owner_id).maybeSingle();
      const { data, error } = await supabase.functions.invoke('send-employee-welcome', {
        body: {
          employeeEmail: company.owner_email,
          employeeName: profile?.full_name || company.owner_email,
          companyName: company.name,
          temporaryPassword: '(Use "Forgot Password" to reset)',
          portalUrl: `${window.location.origin}/auth`,
        }
      });
      if (error) throw error;
      if (data?.requiresDomainVerification) { toast.error("Email domain not verified"); return; }
      toast.success(`Welcome email resent to ${company.owner_email}`);
    } catch (error: any) {
      toast.error("Failed to resend email: " + (error.message || "Unknown error"));
    } finally {
      setResendingEmail(null);
    }
  };

  // Delete company (soft delete via edge function with cancellation fee)
  const handleDeleteCompany = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { company_id: deleteTarget.id, reason: deleteReason || 'Super Admin deletion' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const feeMsg = data?.fee_charged 
        ? `Cancellation fee of $${data.fee_amount} charged.` 
        : data?.charge_error 
          ? `Note: ${data.charge_error}` 
          : '';
      
      toast.success(`Company "${deleteTarget.name}" deleted. ${feeMsg}`);
      queryClient.invalidateQueries({ queryKey: ["pending-companies"] });
    } catch (error: any) {
      toast.error("Failed to delete: " + (error.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setDeleteReason('');
    }
  };

  // Disable/Enable company (toggle is_active)
  const handleToggleActive = async () => {
    if (!disableTarget) return;
    setIsTogglingActive(true);
    const newActive = !(disableTarget.is_active ?? true);
    try {
      const updates: Record<string, any> = { is_active: newActive };
      if (!newActive) {
        updates.subscription_status = 'suspended';
      }
      const { error } = await supabase.from("companies").update(updates).eq("id", disableTarget.id);
      if (error) throw error;
      toast.success(`Company "${disableTarget.name}" ${newActive ? 'enabled' : 'disabled'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ["pending-companies"] });
    } catch (error: any) {
      toast.error("Failed to update: " + (error.message || "Unknown error"));
    } finally {
      setIsTogglingActive(false);
      setDisableTarget(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-success/10 text-success border-success/30">Approved</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      default: return <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const pendingCompanies = companies?.filter(c => c.approval_status === "pending") || [];
  const approvedCompanies = companies?.filter(c => c.approval_status === "approved") || [];
  const rejectedCompanies = companies?.filter(c => c.approval_status === "rejected") || [];

  const CompanyCard = ({ company, showApproveReject = false }: { company: CompanyWithOwner; showApproveReject?: boolean }) => {
    const isActive = company.is_active ?? true;
    
    return (
      <div className={`border rounded-lg p-4 space-y-3 ${!isActive ? 'opacity-60 bg-muted/30' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{company.name}</p>
              <p className="text-sm text-muted-foreground truncate">{company.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {getStatusBadge(company.approval_status)}
            {!isActive && <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Disabled</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{company.owner_email || "No owner"}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{company.city && company.state ? `${company.city}, ${company.state}` : "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            <span>{company.member_count} members</span>
          </div>
          <div className="text-xs">
            {format(new Date(company.created_at), "MMM d, yyyy")}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => openEditDialog(company)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleResendWelcomeEmail(company)}
            disabled={resendingEmail === company.id}
          >
            {resendingEmail === company.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Resend Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDisableTarget(company)}
            className={isActive ? "text-warning border-warning/30 hover:bg-warning/10" : "text-success border-success/30 hover:bg-success/10"}
          >
            {isActive ? <Ban className="h-4 w-4 mr-1" /> : <Power className="h-4 w-4 mr-1" />}
            {isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { setDeleteTarget(company); setDeleteReason(''); }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          {showApproveReject && company.approval_status !== 'approved' && (
            <Button size="sm" onClick={() => approveMutation.mutate(company.id)} disabled={approveMutation.isPending} className="bg-success hover:bg-success/90">
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          {showApproveReject && company.approval_status !== 'rejected' && company.approval_status === 'pending' && (
            <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(company.id)} disabled={rejectMutation.isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Company Approvals</h1>
        <p className="text-muted-foreground mt-1">Review, approve, edit, and manage company registrations.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{pendingCompanies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{approvedCompanies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{rejectedCompanies.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Companies */}
      {pendingCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Companies waiting for your review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingCompanies.map((company) => (
              <CompanyCard key={company.id} company={company} showApproveReject />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Companies
          </CardTitle>
          <CardDescription>Tap Edit to modify, Disable to suspend, or Delete to remove a company</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {companies?.map((company) => (
                <CompanyCard key={company.id} company={company} showApproveReject />
              ))}
              {(!companies || companies.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No companies registered yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Company Dialog */}
      <Dialog open={!!editCompany} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Company
            </DialogTitle>
            <DialogDescription>Update company details and approval status</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-email">Company Email *</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input id="edit-state" value={editForm.state} onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Company Type</Label>
              <Select value={editForm.type} onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companyTypes.map(ct => (<SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approval Status</Label>
              <Select value={editForm.approval_status} onValueChange={(val) => setEditForm(prev => ({ ...prev, approval_status: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editCompany && (
              <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                <p><strong>Owner:</strong> {editCompany.owner_email || 'Unknown'}</p>
                <p><strong>Members:</strong> {editCompany.member_count}</p>
                <p><strong>Registered:</strong> {format(new Date(editCompany.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => editCompany && handleResendWelcomeEmail(editCompany)}
                disabled={resendingEmail === editCompany?.id}
                className="w-full sm:w-auto"
              >
                {resendingEmail === editCompany?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Resend Welcome Email
              </Button>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditCompany(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateCompanyMutation.isPending}>
                  {updateCompanyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Company?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="sr-only">
              Confirm deletion of {deleteTarget?.name}
            </AlertDialogDescription>
            <div className="pt-4 space-y-3">
              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">You are about to delete:</p>
                <p className="font-semibold text-foreground mt-1">{deleteTarget?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{deleteTarget?.email}</p>
              </div>
              <p className="text-destructive font-medium text-sm">
                This will soft-delete the company, deactivate all accounts, and attempt to charge a cancellation fee if a payment method is on file. Data will be permanently purged after 30 days.
              </p>
              <div>
                <Label htmlFor="delete-reason">Reason (optional)</Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Why is this company being deleted?"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteCompany(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isDeleting ? 'Deleting...' : 'Delete Company'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable/Enable Company Confirmation */}
      <AlertDialog open={!!disableTarget} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${(disableTarget?.is_active ?? true) ? 'bg-warning/10' : 'bg-success/10'}`}>
                {(disableTarget?.is_active ?? true) ? <Ban className="h-6 w-6 text-warning" /> : <Power className="h-6 w-6 text-success" />}
              </div>
              <AlertDialogTitle className="text-xl">
                {(disableTarget?.is_active ?? true) ? 'Disable' : 'Enable'} Company?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="sr-only">
              Confirm {(disableTarget?.is_active ?? true) ? 'disabling' : 'enabling'} {disableTarget?.name}
            </AlertDialogDescription>
            <div className="pt-4 space-y-3">
              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Company:</p>
                <p className="font-semibold text-foreground mt-1">{disableTarget?.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {(disableTarget?.is_active ?? true)
                  ? 'Disabling will suspend the company\'s subscription and prevent users from accessing the platform. No data will be deleted.'
                  : 'Enabling will reactivate the company and allow users to access the platform again.'}
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isTogglingActive}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleToggleActive(); }}
              disabled={isTogglingActive}
              className={(disableTarget?.is_active ?? true) ? "bg-warning text-warning-foreground hover:bg-warning/90" : "bg-success text-success-foreground hover:bg-success/90"}
            >
              {isTogglingActive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isTogglingActive ? 'Processing...' : (disableTarget?.is_active ?? true) ? 'Disable Company' : 'Enable Company'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}