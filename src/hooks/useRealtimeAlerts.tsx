import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Ticket, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

interface RealtimeAlertsOptions {
  onNewTicket?: (ticket: any) => void;
  onJobUpdate?: (update: any) => void;
  onNewNotification?: (notification: any) => void;
}

export function useRealtimeAlerts(options: RealtimeAlertsOptions = {}) {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('live-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          const ticket = payload.new as any;
          toast({
            title: "New Call Created",
            description: `${ticket.title} scheduled for ${ticket.scheduled_date}`,
            duration: 5000,
          });
          options.onNewTicket?.(ticket);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          const ticket = payload.new as any;
          const oldTicket = payload.old as any;
          
          // Only notify on status changes
          if (ticket.status !== oldTicket.status) {
            const statusMessages: Record<string, string> = {
              'assigned': 'has been assigned',
              'in_progress': 'is now in progress',
              'completed': 'has been completed',
              'cancelled': 'has been cancelled',
            };
            
            toast({
              title: "Ticket Status Updated",
              description: `"${ticket.title}" ${statusMessages[ticket.status] || `is now ${ticket.status}`}`,
              duration: 4000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_updates',
        },
        (payload) => {
          const update = payload.new as any;
          const statusLabels: Record<string, { label: string; color: string }> = {
            'assigned': { label: 'Job Assigned', color: 'blue' },
            'en_route': { label: 'Agent En Route', color: 'orange' },
            'on_site': { label: 'Agent On Site', color: 'purple' },
            'working': { label: 'Work In Progress', color: 'yellow' },
            'completed': { label: 'Job Completed', color: 'green' },
            'cancelled': { label: 'Job Cancelled', color: 'red' },
          };
          
          const statusInfo = statusLabels[update.status] || { label: update.status, color: 'gray' };
          
          toast({
            title: statusInfo.label,
            description: update.notes || `Agent status updated to ${update.status}`,
            duration: 4000,
          });
          options.onJobUpdate?.(update);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
          options.onNewNotification?.(notification);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, isSuperAdmin, toast, options]);

  return null;
}
