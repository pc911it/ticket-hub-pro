import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutes warning

export const useSessionTimeout = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  const handleContinue = useCallback(async () => {
    // Refresh the session
    const { error } = await supabase.auth.refreshSession();
    if (!error) {
      resetTimer();
    }
  }, [resetTimer]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (!showWarning) {
        setLastActivity(Date.now());
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [showWarning]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const remaining = SESSION_TIMEOUT_MS - timeSinceActivity;

      if (remaining <= 0) {
        // Session expired, log out
        handleLogout();
      } else if (remaining <= WARNING_BEFORE_MS && !showWarning) {
        // Show warning
        setShowWarning(true);
        setTimeLeft(Math.ceil(remaining / 1000));
      } else if (showWarning && remaining > 0) {
        // Update countdown
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, showWarning, handleLogout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SessionTimeoutDialog = () => (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Your session will expire in <span className="font-bold text-foreground">{formatTime(timeLeft)}</span> due to inactivity.</p>
            <p>Would you like to continue working or sign out?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>Sign Out</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>Continue Session</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { SessionTimeoutDialog, resetTimer };
};
