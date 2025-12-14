import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Ticket, AlertTriangle, CheckCircle, MapPin, Building2 } from 'lucide-react';

interface RealtimeAlertsOptions {
  onNewTicket?: (ticket: any) => void;
  onJobUpdate?: (update: any) => void;
  onNewNotification?: (notification: any) => void;
  onPartnershipUpdate?: (partnership: any) => void;
}

export function useRealtimeAlerts(options: RealtimeAlertsOptions = {}) {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Fetch user's company ID for filtering partnership notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchCompany = async () => {
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data) {
        setUserCompanyId(data.company_id);
      }
    };
    fetchCompany();
  }, [user]);

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_companies',
        },
        async (payload) => {
          const partnership = payload.new as any;
          const oldPartnership = payload.old as any;
          
          // Only notify on status changes
          if (partnership.status !== oldPartnership.status) {
            // Check if this affects our company (we invited them)
            const { data: project } = await supabase
              .from('projects')
              .select('name, company_id')
              .eq('id', partnership.project_id)
              .single();
            
            // Fetch the partner company name
            const { data: partnerCompany } = await supabase
              .from('companies')
              .select('name')
              .eq('id', partnership.company_id)
              .single();
            
            // Notify if we are the project owner
            if (project && userCompanyId && project.company_id === userCompanyId) {
              if (partnership.status === 'accepted') {
                toast({
                  title: "Partnership Accepted!",
                  description: `${partnerCompany?.name || 'A company'} has joined "${project.name}"`,
                  duration: 5000,
                });
              } else if (partnership.status === 'declined') {
                toast({
                  title: "Partnership Declined",
                  description: `${partnerCompany?.name || 'A company'} declined to join "${project.name}"`,
                  duration: 5000,
                });
              }
            }
            
            options.onPartnershipUpdate?.(partnership);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_companies',
        },
        async (payload) => {
          const partnership = payload.new as any;
          
          // Check if we are the invited company
          if (userCompanyId && partnership.company_id === userCompanyId) {
            const { data: project } = await supabase
              .from('projects')
              .select('name, companies:company_id(name)')
              .eq('id', partnership.project_id)
              .single();
            
            if (project) {
              toast({
                title: "New Partnership Invitation",
                description: `${(project.companies as any)?.name || 'A company'} invited you to collaborate on "${project.name}"`,
                duration: 6000,
              });
            }
          }
          
          options.onPartnershipUpdate?.(partnership);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, userCompanyId, isSuperAdmin, toast, options]);

  return null;
}
