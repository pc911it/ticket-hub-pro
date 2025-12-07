import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bell, Radio, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveAlert {
  id: string;
  type: 'ticket' | 'job_update' | 'notification';
  title: string;
  message: string;
  timestamp: Date;
}

export function LiveAlertsBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('live-banner-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          const ticket = payload.new as any;
          addAlert({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            title: 'New Call',
            message: ticket.title,
            timestamp: new Date(),
          });
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
          const statusLabels: Record<string, string> = {
            'assigned': 'Job Assigned',
            'en_route': 'Agent En Route',
            'on_site': 'Agent On Site',
            'working': 'Work In Progress',
            'completed': 'Job Completed',
            'cancelled': 'Job Cancelled',
          };
          addAlert({
            id: `job-${update.id}`,
            type: 'job_update',
            title: statusLabels[update.status] || 'Job Update',
            message: update.notes || `Status: ${update.status}`,
            timestamp: new Date(),
          });
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
          addAlert({
            id: `notif-${notification.id}`,
            type: 'notification',
            title: notification.title,
            message: notification.message,
            timestamp: new Date(),
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addAlert = (alert: LiveAlert) => {
    setAlerts((prev) => {
      const newAlerts = [alert, ...prev].slice(0, 5); // Keep last 5 alerts
      return newAlerts;
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }, 10000);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className={cn("h-3 w-3", isConnected ? "text-green-500 animate-pulse" : "text-muted-foreground")} />
        <span>{isConnected ? 'Live' : 'Connecting...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Radio className="h-3 w-3 text-green-500 animate-pulse" />
        <span>Live Updates</span>
        <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
      </div>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={cn(
              "p-3 animate-in slide-in-from-top-2 duration-300 border-l-4",
              alert.type === 'ticket' && "border-l-blue-500 bg-blue-500/5",
              alert.type === 'job_update' && "border-l-amber-500 bg-amber-500/5",
              alert.type === 'notification' && "border-l-purple-500 bg-purple-500/5"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3 flex-shrink-0" />
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">{alert.message}</p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
