import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { LiveAlertsBanner } from '@/components/LiveAlertsBanner';
import { GlobalProjectChat } from '@/components/GlobalProjectChat';
import { NotificationToggle, NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { BillingAlertBanner } from '@/components/BillingAlertBanner';
import { PasswordResetReminder } from '@/components/PasswordResetReminder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Ticket, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Bell,
  Radio,
  UserCircle,
  Plus,
  Shield,
  CreditCard,
  Settings,
  Package,
  Building2,
  CheckSquare,
  DollarSign,
  Trash2,
  FileText,
  Briefcase,
  Clock,
  MessageSquare,
  HeadphonesIcon
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dispatcher', href: '/admin', icon: Radio },
  { name: 'New Call', href: '/admin/new-call', icon: Plus },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Employees', href: '/admin/employees', icon: UserCircle },
  { name: 'Time Reports', href: '/admin/time-reports', icon: Clock },
  { name: 'Updates', href: '/admin/updates', icon: LayoutDashboard },
  { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Client Billing', href: '/admin/client-billing', icon: DollarSign },
  { name: 'Projects', href: '/admin/projects', icon: Building2 },
  { name: 'Plans', href: '/admin/plans', icon: FileText },
  { name: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Trash', href: '/admin/trash', icon: Trash2 },
  { name: 'Support', href: '/admin/support', icon: HeadphonesIcon },
  { name: 'Users', href: '/admin/users', icon: Shield },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const staffNavigation = [
  { name: 'Employee Portal', href: '/employee', icon: Briefcase },
];

const superAdminNavigation = [
  { name: 'Platform Overview', href: '/admin/super-dashboard', icon: LayoutDashboard },
  { name: 'Company Approvals', href: '/admin/company-approvals', icon: CheckSquare },
  { name: 'Support Tickets', href: '/admin/support-tickets', icon: HeadphonesIcon },
  { name: 'Platform Billing', href: '/admin/platform-billing', icon: DollarSign },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isSuperAdmin, isCompanyOwner, userRole } = useAuth();
  
  // Enable real-time alerts
  useRealtimeAlerts();
  
  // Session timeout warning
  const { SessionTimeoutDialog } = useSessionTimeout();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "bg-sidebar text-sidebar-foreground"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Ticket className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">TicketPro</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-sidebar-accent rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Super Admin Section */}
            {isSuperAdmin && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Super Admin
                </div>
                {superAdminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  );
                })}
                <div className="my-3 border-t border-sidebar-border" />
              </>
            )}

            {/* Staff Quick Access */}
            {(userRole === 'staff' || userRole === 'admin') && !isSuperAdmin && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Quick Access
                </div>
                {staffNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Link>
                  );
                })}
                <div className="my-3 border-t border-sidebar-border" />
              </>
            )}

            {/* Regular Navigation */}
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <div className="flex gap-1 mt-1">
                  {isSuperAdmin && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                      Super Admin
                    </Badge>
                  )}
                  {isCompanyOwner && !isSuperAdmin && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-success/10 text-success border-success/30">
                      Owner
                    </Badge>
                  )}
                  {!isSuperAdmin && !isCompanyOwner && userRole && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                      {userRole}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
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
          
          <div className="flex-1" />
          
          {/* Security Settings */}
          {user && <PasswordResetReminder userId={user.id} />}
          
          {/* Notification Toggle */}
          <NotificationToggle />
          
          <Link to="/">
            <Button variant="outline" size="sm">
              View Site
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="p-6 space-y-6">
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
    </div>
  );
};

export default AdminLayout;
