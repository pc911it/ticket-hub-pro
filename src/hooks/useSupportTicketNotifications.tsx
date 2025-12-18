import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SupportNotificationState {
  unreadCount: number;
  hasNewTickets: boolean;
  lastTicketSubject: string | null;
}

export function useSupportTicketNotifications() {
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SupportNotificationState>({
    unreadCount: 0,
    hasNewTickets: false,
    lastTicketSubject: null,
  });
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Fetch user's company ID
  useEffect(() => {
    if (!user?.id || isSuperAdmin) return;

    const fetchCompanyId = async () => {
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.company_id) {
        setUserCompanyId(data.company_id);
      }
    };

    fetchCompanyId();
  }, [user?.id, isSuperAdmin]);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (isSuperAdmin) {
      // Super admin: count open tickets
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      
      setState(prev => ({ ...prev, unreadCount: count || 0 }));
    } else if (userCompanyId) {
      // Company: count tickets with unread staff replies
      // For simplicity, count tickets that are in_progress (staff has replied)
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("company_id", userCompanyId)
        .eq("status", "in_progress");
      
      setState(prev => ({ ...prev, unreadCount: count || 0 }));
    }
  }, [isSuperAdmin, userCompanyId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Set up realtime subscription for super admin
  useEffect(() => {
    if (!isSuperAdmin) return;

    console.log("Setting up global super admin support notifications");

    const channel = supabase
      .channel('global-super-admin-support')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        async (payload) => {
          console.log("Global: New support ticket received:", payload);
          const newTicket = payload.new as any;
          
          // Fetch company name
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', newTicket.company_id)
            .single();
          
          setState(prev => ({
            ...prev,
            unreadCount: prev.unreadCount + 1,
            hasNewTickets: true,
            lastTicketSubject: newTicket.subject,
          }));

          toast.success("🆕 New Support Ticket!", {
            description: `${company?.name || 'A company'}: ${newTicket.subject}`,
            duration: 10000,
          });

          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          // Only notify for non-staff replies (customer messages)
          if (!newMessage.is_staff_reply) {
            console.log("Global: New customer message received:", payload);
            
            const { data: ticket } = await supabase
              .from('support_tickets')
              .select('subject, companies(name)')
              .eq('id', newMessage.ticket_id)
              .single();
            
            toast.info("💬 New customer message!", {
              description: `${(ticket as any)?.companies?.name || 'Customer'} replied to: ${ticket?.subject}`,
              duration: 8000,
            });

            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            queryClient.invalidateQueries({ queryKey: ["ticket-messages"] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log("Global super admin support subscription status:", status);
      });

    return () => {
      console.log("Cleaning up global super admin support subscription");
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, queryClient, fetchUnreadCount]);

  // Set up realtime subscription for company users
  useEffect(() => {
    if (isSuperAdmin || !userCompanyId) return;

    console.log("Setting up global company support notifications for:", userCompanyId);

    const channel = supabase
      .channel(`global-company-support-${userCompanyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        async (payload) => {
          console.log("Global: New support message received:", payload);
          const newMessage = payload.new as any;
          
          // Check if this is a staff reply for our company's ticket
          if (newMessage.is_staff_reply) {
            const { data: ticket } = await supabase
              .from('support_tickets')
              .select('company_id, subject')
              .eq('id', newMessage.ticket_id)
              .single();
            
            if (ticket?.company_id === userCompanyId) {
              setState(prev => ({
                ...prev,
                unreadCount: prev.unreadCount + 1,
                hasNewTickets: true,
                lastTicketSubject: ticket.subject,
              }));

              toast.success("🎉 New support response!", {
                description: `Staff replied to: ${ticket.subject}`,
                duration: 10000,
              });

              queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
              queryClient.invalidateQueries({ queryKey: ["company-ticket-messages"] });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.company_id === userCompanyId) {
            console.log("Global: Support ticket status updated:", payload);
            
            toast.info("📋 Ticket updated", {
              description: `Status changed to: ${updated.status}`,
              duration: 5000,
            });

            fetchUnreadCount();
            queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
          }
        }
      )
      .subscribe((status) => {
        console.log("Global company support subscription status:", status);
      });

    return () => {
      console.log("Cleaning up global company support subscription");
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, userCompanyId, queryClient, fetchUnreadCount]);

  const clearUnreadCount = useCallback(() => {
    setState(prev => ({ ...prev, unreadCount: 0, hasNewTickets: false }));
  }, []);

  return {
    unreadCount: state.unreadCount,
    hasNewTickets: state.hasNewTickets,
    lastTicketSubject: state.lastTicketSubject,
    clearUnreadCount,
    refetchCount: fetchUnreadCount,
  };
}
