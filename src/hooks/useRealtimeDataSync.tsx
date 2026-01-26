import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface RealtimeDataSyncOptions {
  companyId?: string | null;
  onTicketChange?: () => void;
  onProjectChange?: () => void;
  onClientChange?: () => void;
  onAgentChange?: () => void;
  onInventoryChange?: () => void;
  onInvoiceChange?: () => void;
  onDashboardChange?: () => void;
}

/**
 * A comprehensive real-time data synchronization hook that listens to
 * database changes and triggers React Query invalidations or custom callbacks.
 * This enables automatic UI updates without page refreshes.
 */
export function useRealtimeDataSync(options: RealtimeDataSyncOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { companyId } = options;

  // Debounced invalidation to prevent too many rapid refetches
  const invalidateQueries = useCallback((queryKeys: string[][]) => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  useEffect(() => {
    if (!user) return;

    const channelName = companyId 
      ? `realtime-sync-${companyId}` 
      : `realtime-sync-global-${user.id}`;

    const channel = supabase
      .channel(channelName)
      // ==================== TICKETS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          console.log('[RealtimeSync] Ticket change detected:', payload.eventType);
          // Invalidate ticket-related queries
          invalidateQueries([
            ['tickets'],
            ['tickets', companyId || ''],
          ]);
          options.onTicketChange?.();
          options.onDashboardChange?.();
        }
      )
      // ==================== PROJECTS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        (payload) => {
          console.log('[RealtimeSync] Project change detected:', payload.eventType);
          invalidateQueries([
            ['projects'],
            ['projects', companyId || ''],
          ]);
          options.onProjectChange?.();
          options.onDashboardChange?.();
        }
      )
      // ==================== CLIENTS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          console.log('[RealtimeSync] Client change detected:', payload.eventType);
          invalidateQueries([
            ['clients'],
            ['clients', companyId || ''],
          ]);
          options.onClientChange?.();
          options.onDashboardChange?.();
        }
      )
      // ==================== AGENTS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
        },
        (payload) => {
          console.log('[RealtimeSync] Agent change detected:', payload.eventType);
          invalidateQueries([
            ['agents'],
            ['agents', companyId || ''],
          ]);
          options.onAgentChange?.();
        }
      )
      // ==================== INVENTORY ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
        },
        (payload) => {
          console.log('[RealtimeSync] Inventory change detected:', payload.eventType);
          invalidateQueries([
            ['inventory-items'],
            ['inventory-items', companyId || ''],
          ]);
          options.onInventoryChange?.();
          options.onDashboardChange?.();
        }
      )
      // ==================== INVOICES ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_invoices',
        },
        (payload) => {
          console.log('[RealtimeSync] Invoice change detected:', payload.eventType);
          invalidateQueries([
            ['invoices'],
            ['invoices', companyId || ''],
            ['client-invoices'],
          ]);
          options.onInvoiceChange?.();
          options.onDashboardChange?.();
        }
      )
      // ==================== COMPANY MEMBERS (Employees) ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
        },
        (payload) => {
          console.log('[RealtimeSync] Company member change detected:', payload.eventType);
          invalidateQueries([
            ['employees'],
            ['company-members'],
            ['company-members', companyId || ''],
          ]);
          options.onDashboardChange?.();
        }
      )
      // ==================== JOB UPDATES ====================
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_updates',
        },
        (payload) => {
          console.log('[RealtimeSync] Job update detected:', payload.eventType);
          invalidateQueries([
            ['tickets'],
            ['job-updates'],
          ]);
          options.onTicketChange?.();
        }
      )
      // ==================== BIDS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          console.log('[RealtimeSync] Bid change detected:', payload.eventType);
          invalidateQueries([
            ['bids'],
            ['bids', companyId || ''],
          ]);
          options.onDashboardChange?.();
        }
      )
      // ==================== ESTIMATES ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'estimates',
        },
        (payload) => {
          console.log('[RealtimeSync] Estimate change detected:', payload.eventType);
          invalidateQueries([
            ['estimates'],
            ['estimates', companyId || ''],
          ]);
          options.onDashboardChange?.();
        }
      )
      // ==================== PERMITS ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'permits',
        },
        (payload) => {
          console.log('[RealtimeSync] Permit change detected:', payload.eventType);
          invalidateQueries([
            ['permits'],
            ['permits', companyId || ''],
          ]);
          options.onDashboardChange?.();
        }
      )
      // ==================== EQUIPMENT ====================
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        (payload) => {
          console.log('[RealtimeSync] Equipment change detected:', payload.eventType);
          invalidateQueries([
            ['equipment'],
            ['equipment', companyId || ''],
          ]);
          options.onDashboardChange?.();
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeSync] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[RealtimeSync] Cleaning up subscription');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, companyId, invalidateQueries, options]);

  return null;
}
