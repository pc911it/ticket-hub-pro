import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useSupportTicketNotifications } from '@/hooks/useSupportTicketNotifications';
import { useSuperAdminNotifications } from '@/hooks/useSuperAdminNotifications';
import { LiveAlertsBanner } from '@/components/LiveAlertsBanner';
import { GlobalProjectChat } from '@/components/GlobalProjectChat';
import { NotificationToggle, NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { BillingAlertBanner } from '@/components/BillingAlertBanner';
import { PasswordResetReminder } from '@/components/PasswordResetReminder';
import { SuperAdminCompanySelector } from '@/components/SuperAdminCompanySelector';
import { WelcomeTour } from '@/components/WelcomeTour';
import { PaymentGate } from '@/components/PaymentGate';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  // Enable real-time alerts
  useRealtimeAlerts();
  
  // Super admin real-time notifications with sound
  useSuperAdminNotifications();
  
  // Support ticket notifications
  const { unreadCount: supportUnreadCount, clearUnreadCount } = useSupportTicketNotifications();
  
  // Session timeout warning
  const { SessionTimeoutDialog } = useSessionTimeout();

  // Clear unread count when visiting support pages
  useEffect(() => {
    if (location.pathname === '/admin/support' || location.pathname === '/admin/support-tickets') {
      clearUnreadCount();
    }
  }, [location.pathname, clearUnreadCount]);

  // Get sidebar collapsed state for main content margin
  const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';

  return (
    <PaymentGate>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <CollapsibleSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          supportUnreadCount={supportUnreadCount}
        />

        {/* Main content */}
        <div className={sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"} style={{ transition: 'padding-left 0.3s ease-in-out' }}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Live Alerts Indicator */}
            <div className="hidden md:block">
              <LiveAlertsBanner />
            </div>
            
            {/* Super Admin Company Selector */}
            <SuperAdminCompanySelector />
            
            <div className="flex-1" />
            
            {/* Security Settings */}
            {user && <PasswordResetReminder userId={user.id} />}
            
            {/* Notification Toggle */}
            <div data-tour="header-notifications">
              <NotificationToggle />
            </div>
            
            <Link to="/" data-tour="header-view-site">
              <Button variant="outline" size="sm">
                View Site
              </Button>
            </Link>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6 space-y-4">
            {/* Billing Alert Banner */}
            <BillingAlertBanner />
            
            {/* Notification Permission Banner */}
            <NotificationPermissionBanner />
            
            {children}
          </main>

          {/* Global Chat Button */}
          <GlobalProjectChat />
        </div>
        
        {/* Session Timeout Warning */}
        <SessionTimeoutDialog />
        
        {/* Welcome Tour for New Users */}
        <WelcomeTour />
      </div>
    </PaymentGate>
  );
};

export default AdminLayout;
