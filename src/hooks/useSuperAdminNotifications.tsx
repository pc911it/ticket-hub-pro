import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Notification sound URL (a pleasant notification chime)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function useSuperAdminNotifications() {
  const { isSuperAdmin, user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-load the notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  };

  useEffect(() => {
    if (!isSuperAdmin || !user) return;

    console.log('Setting up super admin realtime notifications...');

    // Listen for new companies
    const companiesChannel = supabase
      .channel('super-admin-companies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'companies',
        },
        (payload) => {
          console.log('New company registered:', payload);
          playNotificationSound();
          toast.success('🏢 New Company Registered!', {
            description: `${(payload.new as any).name} just signed up.`,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/admin/companies',
            },
          });
        }
      )
      .subscribe();

    // Listen for new users
    const profilesChannel = supabase
      .channel('super-admin-profiles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const profile = payload.new as any;
          // Don't notify for our own profile
          if (profile.user_id === user.id) return;
          
          console.log('New user registered:', payload);
          playNotificationSound();
          toast.info('👤 New User Registered', {
            description: `${profile.full_name || profile.email} created an account.`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    // Listen for companies pending approval
    const approvalChannel = supabase
      .channel('super-admin-approvals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: 'approval_status=eq.pending',
        },
        (payload) => {
          console.log('Company needs approval:', payload);
          playNotificationSound();
          toast.warning('⏳ Company Pending Approval', {
            description: `${(payload.new as any).name} needs your approval.`,
            duration: 10000,
            action: {
              label: 'Review',
              onClick: () => window.location.href = '/admin/approvals',
            },
          });
        }
      )
      .subscribe();

    // Listen for new support tickets
    const ticketsChannel = supabase
      .channel('super-admin-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const ticket = payload.new as any;
          // Skip system notifications
          if (ticket.category === 'system_notification') return;
          
          console.log('New support ticket:', payload);
          playNotificationSound();
          toast.info('🎫 New Support Ticket', {
            description: ticket.subject,
            duration: 8000,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/admin/support',
            },
          });
        }
      )
      .subscribe();

    // Listen for payment failures
    const billingChannel = supabase
      .channel('super-admin-billing')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'billing_history',
          filter: 'status=eq.failed',
        },
        (payload) => {
          console.log('Payment failed:', payload);
          playNotificationSound();
          toast.error('💳 Payment Failed', {
            description: `A payment of $${(payload.new as any).amount / 100} failed.`,
            duration: 10000,
            action: {
              label: 'Review',
              onClick: () => window.location.href = '/admin/billing',
            },
          });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up super admin notifications...');
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(approvalChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(billingChannel);
    };
  }, [isSuperAdmin, user]);

  return { playNotificationSound };
}