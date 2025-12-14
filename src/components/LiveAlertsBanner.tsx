import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bell, Radio, X, Phone, Truck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveAlert {
  id: string;
  type: 'ticket' | 'job_update' | 'notification';
  title: string;
  message: string;
  timestamp: Date;
}

const alertConfig = {
  ticket: {
    icon: Phone,
    borderColor: 'border-l-info',
    bgColor: 'bg-info/10',
    iconColor: 'text-info',
    badgeVariant: 'info' as const,
  },
  job_update: {
    icon: Truck,
    borderColor: 'border-l-warning',
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning',
    badgeVariant: 'warning' as const,
  },
  notification: {
    icon: MessageSquare,
    borderColor: 'border-l-success',
    bgColor: 'bg-success/10',
    iconColor: 'text-success',
    badgeVariant: 'success' as const,
  },
};

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
      const newAlerts = [alert, ...prev].slice(0, 5);
      return newAlerts;
    });

    // Auto-remove after 15 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }, 15000);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
        <div className="relative">
          <Radio className={cn(
            "h-4 w-4 transition-colors",
            isConnected ? "text-success" : "text-muted-foreground"
          )} />
          {isConnected && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success animate-pulse" />
          )}
        </div>
        <span className={cn(
          "text-sm font-medium",
          isConnected ? "text-success" : "text-muted-foreground"
        )}>
          {isConnected ? 'Live' : 'Connecting...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <Radio className="h-4 w-4 text-success animate-pulse" />
          <span className="text-sm font-semibold text-success">Live Updates</span>
        </div>
        <Badge variant="secondary" className="text-sm font-bold px-3 py-1">
          {alerts.length}
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <Card
              key={alert.id}
              className={cn(
                "p-4 animate-in slide-in-from-top-2 duration-300 border-l-4 shadow-lg hover:shadow-xl transition-shadow",
                config.borderColor,
                config.bgColor
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    config.bgColor
                  )}>
                    <Icon className={cn("h-5 w-5", config.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{alert.title}</p>
                      <Badge variant="outline" className="text-xs">
                        Just now
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1.5 hover:bg-muted/50 rounded-full transition-colors shrink-0"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
