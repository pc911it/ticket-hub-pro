import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  ticket_id: string | null;
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; border: string; badge: string }> = {
  info: { icon: Info, color: 'bg-info/15 text-info', border: 'border-l-info', badge: 'bg-info/20 text-info border-info/30' },
  warning: { icon: AlertTriangle, color: 'bg-warning/15 text-warning', border: 'border-l-warning', badge: 'bg-warning/20 text-warning border-warning/30' },
  success: { icon: CheckCircle2, color: 'bg-success/15 text-success', border: 'border-l-success', badge: 'bg-success/20 text-success border-success/30' },
  error: { icon: XCircle, color: 'bg-destructive/15 text-destructive', border: 'border-l-destructive', badge: 'bg-destructive/20 text-destructive border-destructive/30' },
  update: { icon: Bell, color: 'bg-primary/15 text-primary', border: 'border-l-primary', badge: 'bg-primary/20 text-primary border-primary/30' },
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          toast({
            title: (payload.new as Notification).title,
            description: (payload.new as Notification).message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: 'All notifications marked as read' });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm px-3 py-1 animate-pulse">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Stay updated with driver status and job progress.</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              You'll receive updates when agents update their status.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const config = typeConfig[notification.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "shadow-lg transition-all animate-slide-up hover:shadow-xl border-l-4 overflow-hidden",
                  config.border,
                  !notification.is_read && "ring-2 ring-primary/30 bg-card",
                  notification.is_read && "bg-muted/30"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm", config.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn(
                              "font-semibold text-base",
                              !notification.is_read && "text-foreground",
                              notification.is_read && "text-muted-foreground"
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Badge className={cn("text-xs px-2 py-0.5 border", config.badge)}>
                                New
                              </Badge>
                            )}
                          </div>
                          <p className={cn(
                            "text-sm mt-1",
                            !notification.is_read ? "text-foreground/80" : "text-muted-foreground"
                          )}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                            Mark read
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 font-medium">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;