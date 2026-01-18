import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const REMINDER_INTERVAL = 30000; // 30 seconds

export function useLiveChatNotifications() {
  const { isSuperAdmin, isSupportAdmin, user } = useAuth();
  const location = useLocation();
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundEnabledRef = useRef(true);

  // Check if user has access to live chats
  const hasLiveChatAccess = isSuperAdmin || isSupportAdmin;

  // Check if user is on the live chats page
  const isOnLiveChatsPage = location.pathname === '/admin/live-chats';

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    // Load sound preference
    const savedSoundPref = localStorage.getItem('live-chat-sound');
    soundEnabledRef.current = savedSoundPref !== 'false';
    
    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && soundEnabledRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }, []);

  // Fetch active chat count
  const fetchActiveChatCount = useCallback(async () => {
    if (!hasLiveChatAccess) return;

    const { data, error } = await supabase
      .from('support_chats')
      .select('id', { count: 'exact', head: true })
      .in('status', ['waiting', 'active', 'with_agent']);

    if (!error && data !== null) {
      const count = (data as any)?.length ?? 0;
      setActiveChatCount(count);
      setHasUnreadChats(count > 0);
    }
  }, [hasLiveChatAccess]);

  // Count query with proper count
  const fetchCount = useCallback(async () => {
    if (!hasLiveChatAccess) return;

    const { count, error } = await supabase
      .from('support_chats')
      .select('*', { count: 'exact', head: true })
      .in('status', ['waiting', 'active', 'with_agent']);

    if (!error && count !== null) {
      setActiveChatCount(count);
      setHasUnreadChats(count > 0);
    }
  }, [hasLiveChatAccess]);

  // Start/stop reminder sound based on active chats and page location
  useEffect(() => {
    if (hasUnreadChats && !isOnLiveChatsPage && hasLiveChatAccess) {
      // Start reminder interval
      if (!reminderIntervalRef.current) {
        // Play immediately
        playNotificationSound();
        
        // Then set up interval
        reminderIntervalRef.current = setInterval(() => {
          if (hasUnreadChats && !isOnLiveChatsPage) {
            playNotificationSound();
          }
        }, REMINDER_INTERVAL);
      }
    } else {
      // Clear interval when on page or no unread chats
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    }

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [hasUnreadChats, isOnLiveChatsPage, hasLiveChatAccess, playNotificationSound]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!hasLiveChatAccess || !user) return;

    fetchCount();

    // Subscribe to new chats
    const chatChannel = supabase
      .channel('live-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chats',
        },
        (payload) => {
          console.log('New live chat:', payload);
          playNotificationSound();
          setActiveChatCount(prev => prev + 1);
          setHasUnreadChats(true);
          
          toast.info('💬 New Live Chat', {
            description: `Visitor needs assistance`,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/admin/live-chats',
            },
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_chats',
        },
        (payload) => {
          const chat = payload.new as any;
          // If chat is closed, decrease count
          if (chat.status === 'closed') {
            setActiveChatCount(prev => Math.max(0, prev - 1));
          }
          // Refetch to get accurate count
          fetchCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_messages',
        },
        (payload) => {
          const message = payload.new as any;
          // Only play sound for visitor messages when not on page
          if (message.sender === 'visitor' && !isOnLiveChatsPage) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [hasLiveChatAccess, user, fetchCount, playNotificationSound, isOnLiveChatsPage]);

  // Clear when visiting live chats page
  useEffect(() => {
    if (isOnLiveChatsPage) {
      // Keep the count for the badge but stop the sound
      // The count will update when chats are handled
    }
  }, [isOnLiveChatsPage]);

  const toggleSound = useCallback(() => {
    soundEnabledRef.current = !soundEnabledRef.current;
    localStorage.setItem('live-chat-sound', String(soundEnabledRef.current));
    return soundEnabledRef.current;
  }, []);

  const clearUnreadChats = useCallback(() => {
    setHasUnreadChats(false);
  }, []);

  return {
    activeChatCount,
    hasUnreadChats,
    clearUnreadChats,
    toggleSound,
    refetchCount: fetchCount,
  };
}
