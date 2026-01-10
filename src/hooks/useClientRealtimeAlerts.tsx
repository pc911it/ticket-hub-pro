import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Receipt, FileText, Ticket, CheckCircle, Clock, Bell } from 'lucide-react';

interface ClientRealtimeAlertsOptions {
  clientId: string | null;
  onNewInvoice?: (invoice: any) => void;
  onInvoiceUpdate?: (invoice: any) => void;
  onNewEstimate?: (estimate: any) => void;
  onEstimateUpdate?: (estimate: any) => void;
  onTicketUpdate?: (ticket: any) => void;
  onNewTicket?: (ticket: any) => void;
  onJobUpdate?: (update: any) => void;
}

export function useClientRealtimeAlerts(options: ClientRealtimeAlertsOptions) {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { clientId } = options;

  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client-alerts-${clientId}`)
      // New invoice created for this client
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_invoices',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const invoice = payload.new as any;
          toast({
            title: "New Invoice Received",
            description: `Invoice #${invoice.invoice_number} for $${invoice.amount?.toFixed(2) || '0.00'}`,
            duration: 6000,
          });
          options.onNewInvoice?.(invoice);
        }
      )
      // Invoice status updated
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_invoices',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const invoice = payload.new as any;
          const oldInvoice = payload.old as any;
          
          if (invoice.status !== oldInvoice.status) {
            const statusMessages: Record<string, string> = {
              'paid': 'has been marked as paid',
              'sent': 'has been sent to you',
              'overdue': 'is now overdue',
              'cancelled': 'has been cancelled',
            };
            
            toast({
              title: "Invoice Updated",
              description: `Invoice #${invoice.invoice_number} ${statusMessages[invoice.status] || `status changed to ${invoice.status}`}`,
              duration: 5000,
            });
          }
          options.onInvoiceUpdate?.(invoice);
        }
      )
      // New estimate created for this client
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'estimates',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const estimate = payload.new as any;
          toast({
            title: "New Estimate Received",
            description: `Estimate #${estimate.estimate_number} for $${estimate.amount?.toFixed(2) || '0.00'}`,
            duration: 6000,
          });
          options.onNewEstimate?.(estimate);
        }
      )
      // Estimate status updated
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'estimates',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const estimate = payload.new as any;
          const oldEstimate = payload.old as any;
          
          if (estimate.status !== oldEstimate.status) {
            const statusMessages: Record<string, string> = {
              'accepted': 'has been accepted',
              'declined': 'has been declined',
              'sent': 'has been sent to you',
              'expired': 'has expired',
              'converted': 'has been converted to invoice',
            };
            
            toast({
              title: "Estimate Updated",
              description: `Estimate #${estimate.estimate_number} ${statusMessages[estimate.status] || `status changed to ${estimate.status}`}`,
              duration: 5000,
            });
          }
          options.onEstimateUpdate?.(estimate);
        }
      )
      // Ticket updates for this client
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const ticket = payload.new as any;
          const oldTicket = payload.old as any;
          
          // Notify on status changes
          if (ticket.status !== oldTicket.status) {
            const statusMessages: Record<string, string> = {
              'pending': 'is pending',
              'assigned': 'has been assigned to an agent',
              'confirmed': 'has been confirmed',
              'in_progress': 'is now in progress',
              'completed': 'has been completed - please review and sign',
              'cancelled': 'has been cancelled',
            };
            
            toast({
              title: "Work Order Updated",
              description: `"${ticket.title}" ${statusMessages[ticket.status] || `status: ${ticket.status}`}`,
              duration: 5000,
            });
          }
          
          // Notify on admin approval status changes
          if (ticket.admin_approval_status !== oldTicket.admin_approval_status) {
            if (ticket.admin_approval_status === 'approved') {
              toast({
                title: "Request Approved",
                description: `Your request "${ticket.title}" has been approved`,
                duration: 5000,
              });
            } else if (ticket.admin_approval_status === 'rejected') {
              toast({
                title: "Request Rejected", 
                description: `Your request "${ticket.title}" was not approved`,
                duration: 5000,
              });
            }
          }
          
          options.onTicketUpdate?.(ticket);
        }
      )
      // New ticket created for this client (by admin)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const ticket = payload.new as any;
          // Only notify if not created by client (client-created tickets have admin_approval_status = pending_approval)
          if (ticket.admin_approval_status !== 'pending_approval') {
            toast({
              title: "New Work Order",
              description: `A new work order "${ticket.title}" has been created for you`,
              duration: 5000,
            });
          }
          options.onNewTicket?.(ticket);
        }
      )
      // Job updates for client's tickets
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_updates',
        },
        async (payload) => {
          const update = payload.new as any;
          
          // Check if this update is for a ticket belonging to this client
          const { data: ticket } = await supabase
            .from('tickets')
            .select('title, client_id')
            .eq('id', update.ticket_id)
            .single();
          
          if (ticket && ticket.client_id === clientId) {
            const statusLabels: Record<string, string> = {
              'assigned': 'Job has been assigned',
              'en_route': 'Agent is on the way',
              'on_site': 'Agent has arrived',
              'working': 'Work is in progress',
              'completed': 'Work has been completed',
              'cancelled': 'Job was cancelled',
            };
            
            toast({
              title: statusLabels[update.status] || 'Job Update',
              description: update.notes || `"${ticket.title}" - ${update.status}`,
              duration: 5000,
            });
            
            options.onJobUpdate?.(update);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clientId, toast, options]);

  return null;
}
