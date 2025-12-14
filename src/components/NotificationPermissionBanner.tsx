import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    await requestPermission();
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/10 to-info/10 border-primary/20 shadow-lg animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground">Enable Desktop Notifications</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Get instant alerts for new calls, job updates, and important messages even when the app is in the background.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Button 
              size="sm" 
              onClick={handleEnable}
              disabled={isLoading}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-muted rounded-full transition-colors shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </Card>
  );
}

// Compact toggle for settings/header
export function NotificationToggle() {
  const { permission, isSupported, requestPermission, isEnabled } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (permission === 'denied') {
      // Can't change if denied - user must change in browser settings
      return;
    }
    
    if (permission !== 'granted') {
      setIsLoading(true);
      await requestPermission();
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isEnabled ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading || permission === 'denied'}
      className={cn(
        "gap-2 transition-all",
        isEnabled && "bg-success hover:bg-success/90 text-success-foreground"
      )}
    >
      {isEnabled ? (
        <>
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications On</span>
        </>
      ) : permission === 'denied' ? (
        <>
          <BellOff className="h-4 w-4" />
          <span className="hidden sm:inline">Blocked</span>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          <span className="hidden sm:inline">{isLoading ? 'Enabling...' : 'Enable Alerts'}</span>
        </>
      )}
    </Button>
  );
}
