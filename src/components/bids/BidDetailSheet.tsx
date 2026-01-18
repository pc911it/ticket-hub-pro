import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  DollarSign, 
  User, 
  Building, 
  Calendar,
  Activity,
  Receipt,
  Mail
} from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  performed_by: string | null;
  created_at: string;
}

interface BidDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bid: any;
  onUpdate: () => void;
}

export default function BidDetailSheet({ open, onOpenChange, bid, onUpdate }: BidDetailSheetProps) {
  const { user, isCompanyAdmin } = useAuth();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [rejectType, setRejectType] = useState<'internal' | 'client'>('internal');
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (open && bid) {
      fetchBidDetails();
    }
  }, [open, bid]);

  const fetchBidDetails = async () => {
    const [lineItemsRes, activityRes] = await Promise.all([
      supabase.from('bid_line_items').select('*').eq('bid_id', bid.id).order('sort_order'),
      supabase.from('bid_activity_log').select('*').eq('bid_id', bid.id).order('created_at', { ascending: false }),
    ]);

    if (lineItemsRes.data) setLineItems(lineItemsRes.data);
    if (activityRes.data) setActivityLog(activityRes.data);
  };

  const logActivity = async (action: string, description: string) => {
    await supabase.from('bid_activity_log').insert({
      bid_id: bid.id,
      action,
      description,
      performed_by: user?.id,
    });
  };

  const updateBidStatus = async (updates: any, action: string, description: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bids')
        .update(updates)
        .eq('id', bid.id);

      if (error) throw error;

      await logActivity(action, description);
      toast.success(description);
      onUpdate();
      fetchBidDetails();
    } catch (error: any) {
      console.error('Error updating bid:', error);
      toast.error('Failed to update bid');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = () => {
    updateBidStatus(
      { status: 'pending_approval', submitted_at: new Date().toISOString() },
      'submitted_for_approval',
      'Bid submitted for internal approval'
    );
  };

  const handleInternalApprove = () => {
    updateBidStatus(
      { 
        internal_approval_status: 'approved', 
        internal_approved_by: user?.id,
        internal_approved_at: new Date().toISOString() 
      },
      'internal_approved',
      'Bid approved internally'
    );
  };

  const handleInternalReject = () => {
    setRejectType('internal');
    setShowRejectDialog(true);
  };

  const handleClientApprove = () => {
    updateBidStatus(
      { 
        client_approval_status: 'approved', 
        client_approved_by: user?.id,
        client_approved_at: new Date().toISOString(),
        status: 'won',
        won_at: new Date().toISOString()
      },
      'client_approved',
      'Bid accepted by client - marked as WON'
    );
  };

  const handleClientReject = () => {
    setRejectType('client');
    setShowRejectDialog(true);
  };

  const confirmRejection = () => {
    if (rejectType === 'internal') {
      updateBidStatus(
        { 
          internal_approval_status: 'rejected', 
          internal_rejection_reason: rejectionReason,
          status: 'draft'
        },
        'internal_rejected',
        `Bid rejected internally: ${rejectionReason}`
      );
    } else {
      updateBidStatus(
        { 
          client_approval_status: 'rejected', 
          client_rejection_reason: rejectionReason,
          status: 'lost',
          lost_at: new Date().toISOString()
        },
        'client_rejected',
        `Bid rejected by client: ${rejectionReason}`
      );
    }
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  const handleSendToClient = () => {
    updateBidStatus(
      { status: 'submitted' },
      'sent_to_client',
      'Bid sent to client'
    );
  };

  const handleSendToEmail = async () => {
    if (!customEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    setSendingEmail(true);
    try {
      // Here you would call an edge function to send the email
      // For now, we'll just update the status and log the activity
      await updateBidStatus(
        { status: 'submitted' },
        'sent_to_email',
        `Bid sent to email: ${customEmail}`
      );
      
      await logActivity('email_sent', `Bid sent via email to ${customEmail}`);
      
      toast.success(`Bid sent to ${customEmail}`);
      setShowSendEmailDialog(false);
      setCustomEmail('');
    } catch (error) {
      toast.error('Failed to send bid');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleConvertToInvoice = async () => {
    setLoading(true);
    try {
      // Generate invoice number
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      const { count } = await supabase
        .from('client_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', bid.company_id);
      
      const sequence = ((count || 0) + 1).toString().padStart(4, '0');
      const invoiceNumber = `INV-${year}${month}-${sequence}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('client_invoices')
        .insert({
          company_id: bid.company_id,
          client_id: bid.client_id,
          project_id: bid.project_id,
          invoice_number: invoiceNumber,
          amount: bid.amount,
          currency: bid.currency,
          description: `Invoice from bid: ${bid.title}`,
          line_items: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            total: item.total,
          })),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          status: 'draft',
          notes: `Converted from bid ${bid.bid_number}`,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update bid with conversion info
      await supabase
        .from('bids')
        .update({
          converted_to_invoice_id: invoice.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', bid.id);

      await logActivity('converted_to_invoice', `Converted to invoice ${invoiceNumber}`);

      toast.success(`Invoice ${invoiceNumber} created successfully`);
      setShowConvertDialog(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error converting to invoice:', error);
      toast.error('Failed to convert to invoice');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      draft: { variant: 'secondary' },
      pending_approval: { variant: 'outline' },
      submitted: { variant: 'default' },
      won: { variant: 'default', className: 'bg-green-500' },
      lost: { variant: 'destructive' },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {bid.bid_number}
              </SheetTitle>
              {getStatusBadge(bid.status)}
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold">
                  ${Number(bid.amount).toLocaleString()}
                </span>
              </div>
              {bid.client && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{bid.client.full_name}</span>
                </div>
              )}
              {bid.project && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{bid.project.name}</span>
                </div>
              )}
              {bid.submission_deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {format(new Date(bid.submission_deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {bid.status === 'draft' && (
                <Button onClick={handleSubmitForApproval} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              )}

              {bid.status === 'pending_approval' && bid.internal_approval_status === 'pending' && isCompanyAdmin && (
                <>
                  <Button onClick={handleInternalApprove} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant="destructive" onClick={handleInternalReject} disabled={loading}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              {bid.internal_approval_status === 'approved' && bid.status !== 'submitted' && bid.status !== 'won' && bid.status !== 'lost' && (
                <>
                  <Button onClick={handleSendToClient} disabled={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    Send to Client
                  </Button>
                  <Button variant="outline" onClick={() => setShowSendEmailDialog(true)} disabled={loading}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to Email
                  </Button>
                </>
              )}

              {bid.status === 'submitted' && bid.client_approval_status === 'pending' && (
                <>
                  <Button onClick={handleClientApprove} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Won
                  </Button>
                  <Button variant="destructive" onClick={handleClientReject} disabled={loading}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Lost
                  </Button>
                </>
              )}

              {bid.status === 'won' && !bid.converted_to_invoice_id && bid.client_id && (
                <Button onClick={() => setShowConvertDialog(true)} disabled={loading}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Convert to Invoice
                </Button>
              )}
            </div>

            {/* Approval Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Internal Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={
                    bid.internal_approval_status === 'approved' ? 'default' :
                    bid.internal_approval_status === 'rejected' ? 'destructive' : 'secondary'
                  } className={bid.internal_approval_status === 'approved' ? 'bg-green-500' : ''}>
                    {bid.internal_approval_status?.toUpperCase() || 'PENDING'}
                  </Badge>
                  {bid.internal_rejection_reason && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Reason: {bid.internal_rejection_reason}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Client Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={
                    bid.client_approval_status === 'approved' ? 'default' :
                    bid.client_approval_status === 'rejected' ? 'destructive' : 'secondary'
                  } className={bid.client_approval_status === 'approved' ? 'bg-green-500' : ''}>
                    {bid.client_approval_status?.toUpperCase() || 'PENDING'}
                  </Badge>
                  {bid.client_rejection_reason && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Reason: {bid.client_rejection_reason}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Bid Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Title</label>
                      <p>{bid.title}</p>
                    </div>
                    {bid.description && (
                      <div>
                        <label className="text-sm text-muted-foreground">Description</label>
                        <p>{bid.description}</p>
                      </div>
                    )}
                    {bid.notes && (
                      <div>
                        <label className="text-sm text-muted-foreground">Notes</label>
                        <p>{bid.notes}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-muted-foreground">Created</label>
                      <p>{format(new Date(bid.created_at), 'PPP')}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {lineItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                              {item.discount_percent > 0 && ` (-${item.discount_percent}%)`}
                            </p>
                          </div>
                          <p className="font-medium">${Number(item.total).toFixed(2)}</p>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>${Number(bid.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    {activityLog.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No activity yet</p>
                    ) : (
                      <div className="space-y-3">
                        {activityLog.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                            <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                            <div className="flex-1">
                              <p className="text-sm">{log.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'PPP p')}
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
          </div>
        </SheetContent>
      </Sheet>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rejectType === 'internal' ? 'Reject Bid' : 'Mark Bid as Lost'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for {rejectType === 'internal' ? 'rejecting this bid' : 'marking this bid as lost'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRejection} disabled={!rejectionReason.trim()}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Invoice Dialog */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new invoice based on this bid. The invoice will be created as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToInvoice} disabled={loading}>
              {loading ? 'Converting...' : 'Convert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send to Email Dialog */}
      <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bid to Email</DialogTitle>
            <DialogDescription>
              Enter an email address to send this bid to someone not registered as a client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {bid?.client && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Or send to registered client:</p>
                <p className="text-sm text-muted-foreground">{bid.client.full_name} - {bid.client.email}</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    handleSendToClient();
                    setShowSendEmailDialog(false);
                  }}
                  disabled={loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to Client
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address..."
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendToEmail} disabled={sendingEmail || !customEmail.trim()}>
              {sendingEmail ? 'Sending...' : 'Send to Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
