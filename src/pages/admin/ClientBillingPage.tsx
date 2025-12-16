import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Plus, 
  FileText, 
  DollarSign,
  Users,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Edit,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { SquareCardForm } from '@/components/SquareCardForm';

const ClientBillingPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedSubscriptionForCard, setSelectedSubscriptionForCard] = useState<any>(null);
  const [isSavingCard, setIsSavingCard] = useState(false);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    amount: '',
    billing_interval: 'monthly',
  });
  
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    amount: '',
    description: '',
    due_date: '',
    notes: '',
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    client_id: '',
    payment_plan_id: '',
    payment_method: 'invoice',
  });

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ['user-company-billing', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return membership?.company_id || null;
    },
    enabled: !!user,
  });

  // Fetch payment plans
  const { data: paymentPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['client-payment-plans', company],
    queryFn: async () => {
      if (!company) return [];
      const { data } = await supabase
        .from('client_payment_plans')
        .select('*')
        .eq('company_id', company)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!company,
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients-for-billing', company],
    queryFn: async () => {
      if (!company) return [];
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, email')
        .eq('company_id', company)
        .is('deleted_at', null)
        .order('full_name');
      return data || [];
    },
    enabled: !!company,
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['client-invoices', company],
    queryFn: async () => {
      if (!company) return [];
      const { data } = await supabase
        .from('client_invoices')
        .select('*, clients(full_name, email)')
        .eq('company_id', company)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!company,
  });

  // Fetch subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['client-subscriptions', company],
    queryFn: async () => {
      if (!company) return [];
      const { data } = await supabase
        .from('client_subscriptions')
        .select('*, clients(full_name, email), client_payment_plans(name, amount)')
        .eq('company_id', company)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!company,
  });

  // Create payment plan
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found');
      const { error } = await supabase
        .from('client_payment_plans')
        .insert({
          company_id: company,
          name: planForm.name,
          description: planForm.description,
          amount: Math.round(parseFloat(planForm.amount) * 100),
          billing_interval: planForm.billing_interval,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment plan created');
      setShowAddPlan(false);
      setPlanForm({ name: '', description: '', amount: '', billing_interval: 'monthly' });
      queryClient.invalidateQueries({ queryKey: ['client-payment-plans'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Create invoice
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found');
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from('client_invoices')
        .insert({
          company_id: company,
          client_id: invoiceForm.client_id,
          invoice_number: invoiceNumber,
          amount: Math.round(parseFloat(invoiceForm.amount) * 100),
          description: invoiceForm.description,
          due_date: invoiceForm.due_date,
          notes: invoiceForm.notes,
          status: 'draft',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invoice created');
      setShowCreateInvoice(false);
      setInvoiceForm({ client_id: '', amount: '', description: '', due_date: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Send invoice via email
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('send-client-invoice', {
        body: { invoiceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice sent to client');
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
    onError: (error: Error) => toast.error(`Failed to send invoice: ${error.message}`),
  });

  // Mark invoice as paid
  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('client_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invoice marked as paid');
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Create subscription
  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found');
      const now = new Date();
      const selectedPlan = paymentPlans?.find((p: any) => p.id === subscriptionForm.payment_plan_id);
      
      let periodEnd = new Date(now);
      if (selectedPlan?.billing_interval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (selectedPlan?.billing_interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      
      const { error } = await supabase
        .from('client_subscriptions')
        .insert({
          company_id: company,
          client_id: subscriptionForm.client_id,
          payment_plan_id: subscriptionForm.payment_plan_id,
          payment_method: subscriptionForm.payment_method,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subscription created');
      setShowCreateSubscription(false);
      setSubscriptionForm({ client_id: '', payment_plan_id: '', payment_method: 'invoice' });
      queryClient.invalidateQueries({ queryKey: ['client-subscriptions'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Save card for subscription
  const handleSaveCard = async (cardNonce: string) => {
    if (!selectedSubscriptionForCard) return;
    
    setIsSavingCard(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-client-card', {
        body: {
          clientId: selectedSubscriptionForCard.client_id,
          subscriptionId: selectedSubscriptionForCard.id,
          cardNonce,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Card saved (****${data.cardLast4})`);
      setShowAddCard(false);
      setSelectedSubscriptionForCard(null);
      queryClient.invalidateQueries({ queryKey: ['client-subscriptions'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save card');
    } finally {
      setIsSavingCard(false);
    }
  };

  // Charge subscription now
  const chargeSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.functions.invoke('charge-client-subscription', {
        body: { subscriptionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.results?.[0]?.success) {
        toast.success(`Payment successful: ${formatCurrency(data.results[0].amount)}`);
      } else {
        toast.error(data.results?.[0]?.error || 'Payment failed');
      }
      queryClient.invalidateQueries({ queryKey: ['client-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Billing</h1>
          <p className="text-muted-foreground">Manage payment plans, subscriptions, and invoices</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">From paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoices?.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.amount, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentPlans?.filter(p => p.is_active).length || 0}</div>
            <p className="text-xs text-muted-foreground">Payment plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.filter(s => s.status === 'active').length || 0}</div>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>Create a new invoice for a client</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Client</Label>
                    <Select value={invoiceForm.client_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, client_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount ($)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input 
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={invoiceForm.description}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                      placeholder="Services rendered..."
                    />
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea 
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateInvoice(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending || !invoiceForm.client_id || !invoiceForm.amount || !invoiceForm.due_date}
                  >
                    {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.clients?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {invoice.status === 'draft' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                              disabled={sendInvoiceMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />Send
                            </Button>
                          )}
                          {invoice.status === 'sent' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markPaidMutation.mutate(invoice.id)}
                              disabled={markPaidMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices yet</p>
                  <p className="text-sm">Create your first invoice to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payment Plan</DialogTitle>
                  <DialogDescription>Create a new recurring or one-time payment plan</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input 
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="e.g. Monthly Maintenance"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      placeholder="What's included in this plan..."
                    />
                  </div>
                  <div>
                    <Label>Amount ($)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={planForm.amount}
                      onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Billing Interval</Label>
                    <Select value={planForm.billing_interval} onValueChange={(v) => setPlanForm({ ...planForm, billing_interval: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddPlan(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createPlanMutation.mutate()}
                    disabled={createPlanMutation.isPending || !planForm.name || !planForm.amount}
                  >
                    {createPlanMutation.isPending ? 'Creating...' : 'Create Plan'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plansLoading ? (
              <div className="col-span-3 flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paymentPlans && paymentPlans.length > 0 ? (
              paymentPlans.map((plan: any) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.amount)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.billing_interval === 'one_time' ? 'one-time' : plan.billing_interval}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No payment plans yet</p>
                <p className="text-sm">Create your first plan to offer to clients</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateSubscription} onOpenChange={setShowCreateSubscription}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create Subscription</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Subscription</DialogTitle>
                  <DialogDescription>Assign a client to a payment plan</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Client</Label>
                    <Select 
                      value={subscriptionForm.client_id} 
                      onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, client_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Plan</Label>
                    <Select 
                      value={subscriptionForm.payment_plan_id} 
                      onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, payment_plan_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentPlans?.filter((p: any) => p.is_active).map((plan: any) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(plan.amount)}/{plan.billing_interval === 'one_time' ? 'one-time' : plan.billing_interval}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Billing Type</Label>
                    <Select 
                      value={subscriptionForm.payment_method} 
                      onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card_on_file">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Recurring (Card on File)</span>
                            <span className="text-xs text-muted-foreground">Automatically charge card each billing cycle</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="invoice">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Per Invoice</span>
                            <span className="text-xs text-muted-foreground">Send invoice manually each billing cycle</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscriptionForm.payment_method === 'card_on_file' 
                        ? 'Client card will be charged automatically on each billing date'
                        : 'You will need to create and send invoices manually each period'
                      }
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateSubscription(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createSubscriptionMutation.mutate()}
                    disabled={createSubscriptionMutation.isPending || !subscriptionForm.client_id || !subscriptionForm.payment_plan_id}
                  >
                    {createSubscriptionMutation.isPending ? 'Creating...' : 'Create Subscription'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {subscriptions && subscriptions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.clients?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{sub.client_payment_plans?.name || 'Unknown'}</TableCell>
                        <TableCell>{formatCurrency(sub.client_payment_plans?.amount || 0)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {sub.payment_method === 'card_on_file' ? 'Card on File' : 'Invoice'}
                            </Badge>
                            {sub.payment_method === 'card_on_file' && sub.square_card_id && (
                              <Badge className="bg-green-500/20 text-green-700 text-xs">Card saved</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            sub.status === 'active' ? 'bg-green-500/20 text-green-700' : 
                            sub.status === 'payment_failed' ? 'bg-red-500/20 text-red-700' :
                            'bg-gray-500/20 text-gray-700'
                          }>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.current_period_end 
                            ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {sub.payment_method === 'card_on_file' && !sub.square_card_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedSubscriptionForCard(sub);
                                setShowAddCard(true);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />Add Card
                            </Button>
                          )}
                          {sub.payment_method === 'card_on_file' && sub.square_card_id && sub.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => chargeSubscriptionMutation.mutate(sub.id)}
                              disabled={chargeSubscriptionMutation.isPending}
                            >
                              <Zap className="h-4 w-4 mr-1" />Charge Now
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active subscriptions</p>
                  <p className="text-sm">Create a subscription to assign clients to payment plans</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Card Dialog */}
          <Dialog open={showAddCard} onOpenChange={(open) => {
            setShowAddCard(open);
            if (!open) setSelectedSubscriptionForCard(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Card</DialogTitle>
                <DialogDescription>
                  Save a card for {selectedSubscriptionForCard?.clients?.full_name}'s subscription
                </DialogDescription>
              </DialogHeader>
              <SquareCardForm 
                onCardNonce={handleSaveCard}
                isLoading={isSavingCard}
                buttonText="Save Card"
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientBillingPage;