import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Register service worker
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      setServiceWorkerReady(true);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Push notifications were denied');
        return false;
      } else {
        toast.info('Push notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((payload: NotificationPayload) => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return;
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Check if document is hidden (app in background)
    const isInBackground = document.hidden || document.visibilityState === 'hidden';
    
    // Always show desktop notification if permission granted and in background
    if (isInBackground) {
      try {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.tag || `notification-${Date.now()}`,
          requireInteraction: true,
          data: payload.data,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);

        console.log('Desktop notification shown:', payload.title);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }, [isSupported, permission]);

  const showCriticalAlert = useCallback((title: string, message: string, data?: any) => {
    showNotification({
      title,
      body: message,
      tag: `critical-${Date.now()}`,
      data,
    });
  }, [showNotification]);

  return {
    permission,
    isSupported,
    serviceWorkerReady,
    requestPermission,
    showNotification,
    showCriticalAlert,
    isEnabled: permission === 'granted',
  };
}
