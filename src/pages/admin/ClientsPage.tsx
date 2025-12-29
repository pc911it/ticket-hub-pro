import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, KeyRound, UserPlus, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  company_id: string | null;
  created_at: string;
  portal_user_id: string | null;
  temp_password_created_at: string | null;
  must_change_password: boolean | null;
}

const ClientsPage = () => {
  const { user, isCompanyOwner, isSuperAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForLogin, setSelectedClientForLogin] = useState<Client | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [createWithPortalAccess, setCreateWithPortalAccess] = useState(false);
  const [portalPasswordType, setPortalPasswordType] = useState<'generate' | 'manual'>('generate');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [creatingWithPortal, setCreatingWithPortal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const { toast } = useToast();

  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  
  // Company admins, owners, and super admins can delete
  const canDelete = isCompanyOwner || isSuperAdmin || isCompanyAdmin;
  const canCreateLogin = isCompanyOwner || isSuperAdmin || isCompanyAdmin;

  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        // Super admin can see all clients
        fetchClients();
      } else {
        fetchUserCompany();
      }
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (userCompanyId) {
      fetchClients();
    }
  }, [userCompanyId]);

  const fetchUserCompany = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setUserCompanyId(data.company_id);
      setIsCompanyAdmin(data.role === 'admin');
    } else {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, address, notes, company_id, created_at, portal_user_id, temp_password_created_at, must_change_password')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', address: '', notes: '' });
    setEditingClient(null);
    setCreateWithPortalAccess(false);
    setPortalPasswordType('generate');
    setNewClientPassword('');
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        full_name: client.full_name,
        email: client.email,
        phone: client.phone || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenLoginDialog = (client: Client) => {
    setSelectedClientForLogin(client);
    setLoginPassword('');
    setGeneratedTempPassword(null);
    setIsLoginDialogOpen(true);
  };

  const handleGenerateTempPassword = async () => {
    if (!selectedClientForLogin) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedClientForLogin.email)) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Client has an invalid email address.' });
      return;
    }

    setGeneratingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-portal', {
        body: {
          clientId: selectedClientForLogin.id,
          sendEmail: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedTempPassword(data.tempPassword);
      setShowTempPasswordDialog(true);
      setIsLoginDialogOpen(false);
      
      const message = data.existingUser 
        ? 'Password has been reset. Email sent to client.'
        : 'Portal account created. Email sent to client.';
      toast({ title: 'Success', description: message });
      fetchClients();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Failed to generate password.' 
      });
    } finally {
      setGeneratingPassword(false);
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForLogin || !userCompanyId) return;

    if (loginPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters.' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedClientForLogin.email)) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Client has an invalid email address.' });
      return;
    }

    setCreatingLogin(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: selectedClientForLogin.email.trim().toLowerCase(),
          password: loginPassword,
          fullName: selectedClientForLogin.full_name.trim(),
          role: 'client',
          companyId: userCompanyId,
        },
      });

      if (error) throw error;
      if (data?.error) {
        throw new Error(data.error);
      }

      // Check if password was updated for existing user
      const successMessage = data?.message?.includes('Password updated') 
        ? 'Client portal password updated successfully.' 
        : 'Client portal login created successfully.';
      
      toast({ title: 'Success', description: successMessage });
      setIsLoginDialogOpen(false);
      setLoginPassword('');
      setSelectedClientForLogin(null);
      fetchClients();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Failed to create login.' 
      });
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
      return;
    }

    // Check for duplicate email (excluding current client if editing)
    try {
      const duplicateQuery = supabase
        .from('clients')
        .select('id, email')
        .eq('email', formData.email.trim().toLowerCase())
        .is('deleted_at', null);
      
      if (userCompanyId) {
        duplicateQuery.eq('company_id', userCompanyId);
      }
      
      const { data: existingClients, error: checkError } = await duplicateQuery;

      if (checkError) {
        console.error('Error checking for duplicate:', checkError);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to validate email. Please try again.' });
        return;
      }

      // Check if any existing client has this email (excluding the one being edited)
      const duplicateClient = existingClients?.find(c => 
        editingClient ? c.id !== editingClient.id : true
      );

      if (duplicateClient) {
        toast({ 
          variant: 'destructive', 
          title: 'Email Already Exists', 
          description: 'A client with this email already exists in your company.' 
        });
        return;
      }
    } catch (err) {
      console.error('Duplicate check error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to validate. Please try again.' });
      return;
    }

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update({ ...formData, email: formData.email.trim().toLowerCase() })
        .eq('id', editingClient.id);

      if (error) {
        console.error('Update error:', error);
        const errorMsg = error.code === '23505' ? 'A client with this email already exists.' : 'Failed to update client.';
        toast({ variant: 'destructive', title: 'Error', description: errorMsg });
      } else {
        toast({ title: 'Success', description: 'Client updated successfully.' });
        fetchClients();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      setCreatingWithPortal(createWithPortalAccess);
      
      const { data: newClient, error } = await supabase.from('clients').insert({
        ...formData,
        email: formData.email.trim().toLowerCase(),
        company_id: userCompanyId,
      }).select().single();

      if (error) {
        console.error('Insert error:', error);
        const errorMsg = error.code === '23505' ? 'A client with this email already exists.' : 'Failed to create client.';
        toast({ variant: 'destructive', title: 'Error', description: errorMsg });
        setCreatingWithPortal(false);
        return;
      }

      // If portal access requested
      if (createWithPortalAccess && newClient) {
        try {
          if (portalPasswordType === 'generate') {
            // Generate temporary password
            const { data, error: portalError } = await supabase.functions.invoke('create-client-portal', {
              body: {
                clientId: newClient.id,
                sendEmail: true,
              },
            });

            if (portalError) throw portalError;
            if (data?.error) throw new Error(data.error);

            setGeneratedTempPassword(data.tempPassword);
            setShowTempPasswordDialog(true);
            toast({ title: 'Success', description: 'Client created with portal access. Temporary password generated.' });
          } else if (newClientPassword.length >= 6) {
            // Manual password
            const { data, error: loginError } = await supabase.functions.invoke('create-user', {
              body: {
                email: formData.email.trim().toLowerCase(),
                password: newClientPassword,
                fullName: formData.full_name.trim(),
                role: 'client',
                companyId: userCompanyId,
              },
            });

            if (loginError) throw loginError;
            if (data?.error && !data.error.includes('already') && !data.error.includes('Password updated')) {
              throw new Error(data.error);
            }

            toast({ title: 'Success', description: 'Client created with portal access.' });
          }
        } catch (loginErr: any) {
          toast({ 
            title: 'Partial Success', 
            description: `Client created but portal login failed: ${loginErr.message}` 
          });
        }
      } else {
        toast({ title: 'Success', description: 'Client created successfully.' });
      }

      fetchClients();
      setIsDialogOpen(false);
      resetForm();
      setCreatingWithPortal(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteClient) return;
    setDeleting(true);

    // Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteClient.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete client.' });
    } else {
      toast({ title: 'Moved to Trash', description: 'Client moved to trash. You can restore it within 30 days.' });
      fetchClients();
    }
    setDeleting(false);
    setDeleteClient(null);
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllClients = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return;
    setDeleting(true);

    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', Array.from(selectedClients));

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete clients.' });
    } else {
      toast({ title: 'Moved to Trash', description: `${selectedClients.size} client(s) moved to trash.` });
      setSelectedClients(new Set());
      fetchClients();
    }
    setDeleting(false);
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
          <h1 className="text-3xl font-display font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client database.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Update client information.' : 'Add a new client to your database.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Portal Access Option - Only for new clients */}
              {!editingClient && canCreateLogin && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Portal Access</Label>
                      <p className="text-xs text-muted-foreground">
                        Client can log in to view their projects and request work
                      </p>
                    </div>
                    <Switch
                      checked={createWithPortalAccess}
                      onCheckedChange={setCreateWithPortalAccess}
                    />
                  </div>
                  {createWithPortalAccess && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Password Type Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Password Option</Label>
                        
                        <div 
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            portalPasswordType === 'generate' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setPortalPasswordType('generate')}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                              portalPasswordType === 'generate' ? 'border-primary' : 'border-muted-foreground'
                            }`}>
                              {portalPasswordType === 'generate' && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">
                                <KeyRound className="h-3.5 w-3.5" />
                                Generate Temporary Password
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Auto-generated password, client must change on first login
                              </p>
                            </div>
                          </div>
                        </div>

                        <div 
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            portalPasswordType === 'manual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setPortalPasswordType('manual')}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                              portalPasswordType === 'manual' ? 'border-primary' : 'border-muted-foreground'
                            }`}>
                              {portalPasswordType === 'manual' && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">Set Manual Password</p>
                              <p className="text-xs text-muted-foreground">
                                You specify the password for the client
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Manual Password Input */}
                      {portalPasswordType === 'manual' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="new_client_password">Portal Password *</Label>
                          <Input
                            id="new_client_password"
                            type="password"
                            value={newClientPassword}
                            onChange={(e) => setNewClientPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            minLength={6}
                            required={portalPasswordType === 'manual'}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    creatingWithPortal || 
                    (createWithPortalAccess && portalPasswordType === 'manual' && newClientPassword.length < 6)
                  }
                >
                  {creatingWithPortal ? 'Creating...' : editingClient ? 'Update' : createWithPortalAccess ? 'Create with Portal' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Create Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Client Portal Access</DialogTitle>
            <DialogDescription>
              {selectedClientForLogin?.portal_user_id 
                ? `Reset portal access for ${selectedClientForLogin?.full_name}` 
                : `Create portal login for ${selectedClientForLogin?.full_name}`}
              <br />
              <span className="text-xs">({selectedClientForLogin?.email})</span>
            </DialogDescription>
          </DialogHeader>
          
          {/* Option 1: Generate Temp Password (Recommended) */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Generate Temporary Password</p>
                <p className="text-xs text-muted-foreground">Recommended - Client must change on first login</p>
              </div>
            </div>
            <Button 
              onClick={handleGenerateTempPassword}
              disabled={generatingPassword}
              className="w-full"
            >
              {generatingPassword ? 'Generating...' : selectedClientForLogin?.portal_user_id ? 'Reset & Email New Password' : 'Create & Email Password'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or set manually</span>
            </div>
          </div>

          {/* Option 2: Manual Password */}
          <form onSubmit={handleCreateLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login_password">Manual Password</Label>
              <Input
                id="login_password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
                minLength={6}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsLoginDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" disabled={creatingLogin || loginPassword.length < 6}>
                {creatingLogin ? 'Setting...' : 'Set Manual Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Display Dialog */}
      <Dialog open={showTempPasswordDialog} onOpenChange={setShowTempPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-success">Password Generated</DialogTitle>
            <DialogDescription>
              Save this password - it will only be shown once!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Temporary Password</p>
              <code className="text-lg font-mono font-bold tracking-wider select-all">
                {generatedTempPassword}
              </code>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (generatedTempPassword) {
                    navigator.clipboard.writeText(generatedTempPassword);
                    toast({ title: 'Copied', description: 'Password copied to clipboard' });
                  }
                }}
              >
                Copy Password
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowTempPasswordDialog(false);
                  setGeneratedTempPassword(null);
                  setSelectedClientForLogin(null);
                }}
              >
                Done
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              An email with this password has been sent to the client.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bulk Actions */}
      {canDelete && filteredClients.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
            onCheckedChange={selectAllClients}
          />
          <span className="text-sm text-muted-foreground">
            {selectedClients.size > 0 ? `${selectedClients.size} selected` : 'Select all'}
          </span>
          {selectedClients.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedClients.size})
            </Button>
          )}
        </div>
      )}

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No clients found matching your search.' : 'No clients yet. Add your first client!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <Card 
              key={client.id} 
              className="border-0 shadow-md hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {canDelete && (
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                        className="mt-1"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{client.full_name}</h3>
                        {client.portal_user_id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/30">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Portal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Client since {format(new Date(client.created_at), 'MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canCreateLogin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleOpenLoginDialog(client)}
                        title="Create portal login"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteClient(client)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deleteClient}
        onOpenChange={(open) => !open && setDeleteClient(null)}
        onConfirm={handleDelete}
        title="Client"
        itemName={deleteClient?.full_name || ''}
        itemType="client"
        loading={deleting}
      />
    </div>
  );
};

export default ClientsPage;
