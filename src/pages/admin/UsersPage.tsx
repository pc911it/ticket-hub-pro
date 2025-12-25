import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Shield, User, Users, Briefcase, Building2, KeyRound, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  company_name?: string;
}

export default function UsersPage() {
  const { user, userRole, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserWithRole | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user" as AppRole,
  });

  // Fetch user's company and check if they're a company admin
  useEffect(() => {
    const fetchUserCompany = async () => {
      if (!user) return;
      
      if (isSuperAdmin) {
        setIsCompanyAdmin(true); // Super admin has all permissions
        return;
      }
      
      const { data } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setUserCompanyId(data.company_id);
        setIsCompanyAdmin(data.role === "admin");
      }
    };
    
    fetchUserCompany();
  }, [user, isSuperAdmin]);

  const canManageUsers = isCompanyAdmin || isSuperAdmin;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles", userCompanyId, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Super admin sees all users with their company info
        const { data: members, error: membersError } = await supabase
          .from("company_members")
          .select(`
            user_id,
            role,
            companies (name)
          `);

        if (membersError) throw membersError;

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, email");

        if (profilesError) throw profilesError;

        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const memberInfo = members?.find((m) => m.user_id === profile.user_id);
          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            role: memberInfo?.role || "user",
            company_name: (memberInfo?.companies as any)?.name || "No Company",
          };
        });

        return usersWithRoles;
      } else {
        // Company admin only sees their company's users
        if (!userCompanyId) return [];

        const { data: members, error: membersError } = await supabase
          .from("company_members")
          .select("user_id, role")
          .eq("company_id", userCompanyId);

        if (membersError) throw membersError;

        const userIds = members?.map((m) => m.user_id) || [];
        
        if (userIds.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, email")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        // Build users list from members, with profile info if available
        const usersWithRoles: UserWithRole[] = members.map((member) => {
          const profile = profiles?.find((p) => p.user_id === member.user_id);
          return {
            id: profile?.id || member.user_id,
            user_id: member.user_id,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
            role: member.role || "user",
          };
        });

        return usersWithRoles;
      }
    },
    enabled: canManageUsers && (isSuperAdmin || !!userCompanyId),
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email.trim())) {
        throw new Error("Please enter a valid email address");
      }

      // Validate password strength
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      // Validate name
      if (!userData.fullName.trim()) {
        throw new Error("Full name is required");
      }

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          fullName: userData.fullName.trim(),
          role: userData.role,
          companyId: userCompanyId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      const message = data?.message?.includes('Password updated') 
        ? "User password updated successfully" 
        : "User created successfully and added to your company";
      toast.success(message);
      setIsCreateOpen(false);
      setNewUser({ email: "", password: "", fullName: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Update company_members role
      const { error: memberError } = await supabase
        .from("company_members")
        .update({ role })
        .eq("user_id", userId);

      if (memberError) throw memberError;

      // Also update user_roles for consistency
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      // Role error is not critical
      if (roleError) console.log("user_roles update failed:", roleError.message);
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword, companyId }: { userId: string; newPassword: string; companyId?: string }) => {
      // Validate password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }
      
      const response = await supabase.functions.invoke("reset-user-password", {
        body: { userId, newPassword, companyId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setIsResetPasswordOpen(false);
      setSelectedUserForReset(null);
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const response = await supabase.functions.invoke("delete-company-user", {
        body: { userId, companyId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("User removed successfully");
      setIsDeleteOpen(false);
      setSelectedUserForDelete(null);
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "staff":
        return "default";
      case "client":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "staff":
        return <Briefcase className="h-3 w-3" />;
      case "client":
        return <Users className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  // Check if there's already an admin (to prevent creating more)
  const hasExistingAdmin = users?.some((u) => u.role === "admin");

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? "Manage users across all companies" 
              : "Create and manage users for your company"}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(newUser);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
                <PasswordStrengthIndicator password={newUser.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AppRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Basic User - Pending work access
                      </span>
                    </SelectItem>
                    <SelectItem value="staff">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Staff - Dispatcher access
                      </span>
                    </SelectItem>
                    <SelectItem value="client">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Client - Ticket updates only
                      </span>
                    </SelectItem>
                    {/* Only show admin option if no admin exists or super admin is creating */}
                    {(isSuperAdmin || !hasExistingAdmin) && (
                      <SelectItem value="admin" disabled={hasExistingAdmin && !isSuperAdmin}>
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin - Full access {hasExistingAdmin ? "(already exists)" : ""}
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {hasExistingAdmin && !isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Note: Only one admin is permitted per company
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "admin").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "staff").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "client").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isSuperAdmin ? "All Users (All Companies)" : "Company Users"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users?.length === 0 ? (
            <p className="text-muted-foreground">No users found. Create your first user above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {isSuperAdmin && <TableHead>Company</TableHead>}
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {user.company_name || "—"}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(value: AppRole) =>
                            updateRoleMutation.mutate({ userId: user.user_id, role: value })
                          }
                          disabled={user.role === "admin" && !isSuperAdmin}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            {(isSuperAdmin || user.role === "admin") && (
                              <SelectItem value="admin">Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {/* Reset password button - visible to super admins and company admins (for non-admin users) */}
                        {(isSuperAdmin || (canManageUsers && user.role !== "admin")) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedUserForReset(user);
                              setIsResetPasswordOpen(true);
                            }}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Delete button - visible to company admins and super admins */}
                        {user.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedUserForDelete(user);
                              setIsDeleteOpen(true);
                            }}
                            title="Remove User"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={(open) => {
        setIsResetPasswordOpen(open);
        if (!open) {
          setSelectedUserForReset(null);
          setNewPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for <strong>{selectedUserForReset?.full_name || selectedUserForReset?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>
            <Button
              onClick={() => {
                if (selectedUserForReset && newPassword) {
                  resetPasswordMutation.mutate({
                    userId: selectedUserForReset.user_id,
                    newPassword,
                    companyId: userCompanyId || undefined,
                  });
                }
              }}
              disabled={!newPassword || !validatePassword(newPassword).isValid || resetPasswordMutation.isPending}
              className="w-full"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedUserForDelete?.full_name || selectedUserForDelete?.email}</strong> from your company? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUserForDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUserForDelete && userCompanyId) {
                  deleteUserMutation.mutate({
                    userId: selectedUserForDelete.user_id,
                    companyId: userCompanyId,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
