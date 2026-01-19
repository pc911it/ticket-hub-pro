import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useCompanyLiveSupportNotifications() {
  const { user, isSuperAdmin } = useAuth();
  const [waitingChatCount, setWaitingChatCount] = useState(0);
  const queryClient = useQueryClient();

  const fetchWaitingCount = useCallback(async () => {
    if (!isSuperAdmin) {
      setWaitingChatCount(0);
      return;
    }

    const { count, error } = await supabase
      .from('company_support_chats')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    if (!error && count !== null) {
      setWaitingChatCount(count);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchWaitingCount();
  }, [fetchWaitingCount]);

  useEffect(() => {
    if (!isSuperAdmin || !user) return;

    const channel = supabase
      .channel('company-live-support-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_support_chats',
        },
        async (payload) => {
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});

          // Fetch company name for the toast
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', (payload.new as any).company_id)
            .single();

          toast.info('New Live Support Request', {
            description: `${company?.name || 'A company'} needs support`,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/admin/company-live-support',
            },
          });

          fetchWaitingCount();
          queryClient.invalidateQueries({ queryKey: ['all-company-support-chats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_support_chats',
        },
        () => {
          fetchWaitingCount();
          queryClient.invalidateQueries({ queryKey: ['all-company-support-chats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_support_chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          // Only notify for company user messages
          if (newMessage.sender_type === 'company_user') {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          }
          queryClient.invalidateQueries({ queryKey: ['admin-support-chat-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, user, fetchWaitingCount, queryClient]);

  return {
    waitingChatCount,
    refetchCount: fetchWaitingCount,
  };
}
