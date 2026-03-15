import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, CheckCircle, XCircle, Clock, Users, Mail, MapPin, Pencil, Send, Loader2, RefreshCw } from "lucide-react";
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

  // Edit dialog state
  const [editCompany, setEditCompany] = useState<CompanyWithOwner | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    type: '',
    approval_status: '',
  });

  // Resend email state
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["pending-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const companiesWithDetails: CompanyWithOwner[] = await Promise.all(
        (data || []).map(async (company) => {
          let owner_email: string | undefined;
          let member_count = 0;

          if (company.owner_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("user_id", company.owner_id)
              .maybeSingle();
            owner_email = profile?.email || undefined;
          }

          const { count } = await supabase
            .from("company_members")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id);
          member_count = count || 0;

          return { ...company, owner_email, member_count };
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
      
      try {
        await supabase.functions.invoke("send-approval-email", {
          body: { company_id: companyId, status: "approved" },
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
    },
    onSuccess: () => {
      toast.success("Company approved successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-companies"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc("reject_company", { _company_id: companyId });
      if (error) throw error;
      
      try {
        await supabase.functions.invoke("send-approval-email", {
          body: { company_id: companyId, status: "rejected" },
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }
    },
    onSuccess: () => {
      toast.success("Company rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-companies"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ companyId, updates }: { companyId: string; updates: Record<string, any> }) => {
      // Handle approval_status changes via RPC for proper authorization
      const { approval_status, ...otherUpdates } = updates;
      
      if (Object.keys(otherUpdates).length > 0) {
        const { error } = await supabase
          .from("companies")
          .update(otherUpdates)
          .eq("id", companyId);
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
          const { error } = await supabase
            .from("companies")
            .update({ approval_status: 'pending' })
            .eq("id", companyId);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Company updated successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-companies"] });
      setEditCompany(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to update company: " + error.message);
    },
  });

  const openEditDialog = (company: CompanyWithOwner) => {
    setEditCompany(company);
    setEditForm({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      type: company.type || 'other',
      approval_status: company.approval_status || 'pending',
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

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setEditCompany(null);
      return;
    }

    updateCompanyMutation.mutate({ companyId: editCompany.id, updates });
  };

  const handleResendWelcomeEmail = async (company: CompanyWithOwner) => {
    if (!company.owner_id || !company.owner_email) {
      toast.error("No owner email found for this company");
      return;
    }

    setResendingEmail(company.id);
    try {
      // Get owner profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", company.owner_id)
        .maybeSingle();

      const ownerName = profile?.full_name || company.owner_email;

      // Send welcome email with a reset password link
      const { data, error } = await supabase.functions.invoke('send-employee-welcome', {
        body: {
          employeeEmail: company.owner_email,
          employeeName: ownerName,
          companyName: company.name,
          temporaryPassword: '(Use "Forgot Password" to reset)',
          portalUrl: `${window.location.origin}/auth`,
        }
      });

      if (error) throw error;

      if (data?.requiresDomainVerification) {
        toast.error("Email domain not verified. Contact support to configure email sending.");
        return;
      }

      toast.success(`Welcome email resent to ${company.owner_email}`);
    } catch (error: any) {
      console.error("Failed to resend email:", error);
      toast.error("Failed to resend email: " + (error.message || "Unknown error"));
    } finally {
      setResendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/30">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const pendingCompanies = companies?.filter(c => c.approval_status === "pending") || [];
  const approvedCompanies = companies?.filter(c => c.approval_status === "approved") || [];
  const rejectedCompanies = companies?.filter(c => c.approval_status === "rejected") || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Company Approvals</h1>
        <p className="text-muted-foreground mt-1">Review, approve, edit, and manage company registrations.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCompanies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Companies</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCompanies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCompanies.length}</div>
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">{company.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {company.owner_email || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {company.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {company.city}, {company.state}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(company)}
                          title="Edit company"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendWelcomeEmail(company)}
                          disabled={resendingEmail === company.id}
                          title="Resend welcome email"
                        >
                          {resendingEmail === company.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(company.id)}
                          disabled={approveMutation.isPending}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(company.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <CardDescription>Complete list of registered companies — click Edit to modify any company</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies?.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">{company.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.owner_email || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {company.member_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {company.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(company.approval_status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(company)}
                          title="Edit company"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendWelcomeEmail(company)}
                          disabled={resendingEmail === company.id}
                          title="Resend welcome email"
                        >
                          {resendingEmail === company.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Resend Email
                        </Button>
                        {company.approval_status !== 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(company.id)}
                            disabled={approveMutation.isPending}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
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

      {/* Edit Company Dialog */}
      <Dialog open={!!editCompany} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Company
            </DialogTitle>
            <DialogDescription>
              Update company details and approval status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Company Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={editForm.state}
                  onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Company Type</Label>
              <Select value={editForm.type} onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Approval Status</Label>
              <Select value={editForm.approval_status} onValueChange={(val) => setEditForm(prev => ({ ...prev, approval_status: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => editCompany && handleResendWelcomeEmail(editCompany)}
                disabled={resendingEmail === editCompany?.id}
              >
                {resendingEmail === editCompany?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Resend Welcome Email
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditCompany(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={updateCompanyMutation.isPending}
                >
                  {updateCompanyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
