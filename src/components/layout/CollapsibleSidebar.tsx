import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Ticket, 
  LogOut, 
  X,
  ChevronRight,
  ChevronLeft,
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
  HeadphonesIcon,
  Wrench,
  Gavel,
  FileQuestion,
  ClipboardList,
  Box,
  FileCheck,
  UserPlus,
  FileSignature,
  NotebookPen,
  ClipboardCheck,
  Hammer,
  Calculator,
  Truck,
  Palette,
  HardHat,
  Shapes,
  Library,
  BellRing,
  Gift,
  ChevronDown,
  FolderOpen,
  Wallet,
  Headphones,
  Cog,
  TrendingUp,
  Bot
} from 'lucide-react';

interface NavItem {
  nameKey: string;
  href: string;
  icon: any;
  badge?: number;
  featureKey?: string;
}

interface NavGroup {
  nameKey: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface CollapsibleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  supportUnreadCount: number;
  liveChatCount?: number;
  companyLiveSupportCount?: number;
}

// Pages restricted to admins only
const restrictedPages = ['/admin/client-billing', '/admin/billing', '/admin/settings', '/admin/users', '/admin/payment-settings'];

// Navigation groups configuration with translation keys
const createNavigationGroups = (hasFeature: (key: string) => boolean, isAdminLevel: boolean): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      nameKey: 'sidebar.operations',
      icon: Radio,
      defaultOpen: true,
      items: [
        { nameKey: 'sidebar.dashboard', href: '/admin', icon: LayoutDashboard },
        { nameKey: 'sidebar.dispatcher', href: '/admin/dispatcher', icon: Radio },
        { nameKey: 'sidebar.newCall', href: '/admin/new-call', icon: Plus },
        { nameKey: 'sidebar.calendar', href: '/admin/calendar', icon: Calendar },
        { nameKey: 'sidebar.notifications', href: '/admin/notifications', icon: Bell },
        { nameKey: 'sidebar.updates', href: '/admin/updates', icon: LayoutDashboard },
      ]
    },
    {
      nameKey: 'sidebar.team',
      icon: Users,
      items: [
        { nameKey: 'sidebar.employees', href: '/admin/employees', icon: UserCircle },
        { nameKey: 'sidebar.timeReports', href: '/admin/time-reports', icon: Clock },
      ]
    },
    {
      nameKey: 'sidebar.salesCrm',
      icon: TrendingUp,
      items: [
        { nameKey: 'sidebar.leads', href: '/admin/leads', icon: UserPlus, featureKey: 'leads_management' },
        { nameKey: 'sidebar.clients', href: '/admin/clients', icon: Users },
        { nameKey: 'sidebar.bids', href: '/admin/bids', icon: Gavel, featureKey: 'bid_management' },
        { nameKey: 'sidebar.contracts', href: '/admin/contracts', icon: FileSignature, featureKey: 'contracts_esign' },
        { nameKey: 'sidebar.followUps', href: '/admin/follow-ups', icon: BellRing, featureKey: 'follow_ups' },
      ]
    },
    {
      nameKey: 'sidebar.projects',
      icon: Building2,
      items: [
        { nameKey: 'sidebar.projects', href: '/admin/projects', icon: Building2, featureKey: 'project_management' },
        { nameKey: 'sidebar.changeOrders', href: '/admin/change-orders', icon: FileSignature, featureKey: 'change_orders' },
        { nameKey: 'sidebar.rfis', href: '/admin/rfis', icon: FileQuestion, featureKey: 'rfi_management' },
        { nameKey: 'sidebar.submittals', href: '/admin/submittals', icon: ClipboardList, featureKey: 'submittal_management' },
        { nameKey: 'sidebar.permits', href: '/admin/permits', icon: FileCheck, featureKey: 'permit_tracking' },
        { nameKey: 'sidebar.dailyLogs', href: '/admin/daily-logs', icon: NotebookPen, featureKey: 'daily_logs' },
        { nameKey: 'sidebar.workOrders', href: '/admin/work-orders', icon: Hammer, featureKey: 'work_orders' },
        { nameKey: 'sidebar.punchLists', href: '/admin/punch-lists', icon: ClipboardCheck, featureKey: 'punch_lists' },
        { nameKey: 'sidebar.inspections', href: '/admin/inspections', icon: ClipboardCheck, featureKey: 'inspections' },
        { nameKey: 'sidebar.floorPlans3d', href: '/admin/floor-plans', icon: Box, featureKey: 'floor_plans_3d' },
        { nameKey: 'sidebar.plans', href: '/admin/plans', icon: FileText },
      ]
    },
    {
      nameKey: 'sidebar.financial',
      icon: Wallet,
      items: [
        ...(isAdminLevel ? [{ nameKey: 'sidebar.clientBilling', href: '/admin/client-billing', icon: DollarSign }] : []),
        { nameKey: 'sidebar.budgeting', href: '/admin/budgeting', icon: Calculator, featureKey: 'basic_budgeting' },
        { nameKey: 'sidebar.costCalculator', href: '/admin/cost-calculator', icon: Calculator, featureKey: 'cost_estimating' },
      ]
    },
    {
      nameKey: 'sidebar.resources',
      icon: Package,
      items: [
        { nameKey: 'sidebar.inventory', href: '/admin/inventory', icon: Package, featureKey: 'inventory_management' },
        { nameKey: 'sidebar.equipment', href: '/admin/equipment', icon: Truck, featureKey: 'equipment_tracking' },
        { nameKey: 'sidebar.subcontractors', href: '/admin/subcontractors', icon: HardHat, featureKey: 'subcontractor_matching' },
        { nameKey: 'sidebar.productLibrary', href: '/admin/product-library', icon: Library, featureKey: 'product_library' },
      ]
    },
    {
      nameKey: 'sidebar.design',
      icon: Palette,
      items: [
        { nameKey: 'sidebar.selections', href: '/admin/selections', icon: Palette, featureKey: 'selections_allowances' },
        { nameKey: 'sidebar.moodBoards', href: '/admin/mood-boards', icon: Shapes, featureKey: 'mood_boards' },
      ]
    },
    {
      nameKey: 'sidebar.aiTools',
      icon: Bot,
      items: [
        { nameKey: 'sidebar.aiAssistant', href: '/admin/ai-tools', icon: Bot },
      ]
    },
    {
      nameKey: 'sidebar.support',
      icon: Headphones,
      items: [
        { nameKey: 'sidebar.tickets', href: '/admin/tickets', icon: Ticket },
        { nameKey: 'sidebar.chatTickets', href: '/admin/chat-tickets', icon: MessageSquare },
        { nameKey: 'sidebar.support', href: '/admin/support', icon: HeadphonesIcon },
        { nameKey: 'sidebar.warranties', href: '/admin/warranties', icon: Shield, featureKey: 'warranties' },
      ]
    },
    {
      nameKey: 'sidebar.settings',
      icon: Cog,
      items: [
        { nameKey: 'sidebar.serviceTypes', href: '/admin/service-types', icon: Wrench },
        ...(isAdminLevel ? [
          { nameKey: 'sidebar.users', href: '/admin/users', icon: Shield },
          { nameKey: 'sidebar.billing', href: '/admin/billing', icon: CreditCard },
          { nameKey: 'sidebar.paymentSettings', href: '/admin/payment-settings', icon: DollarSign },
          { nameKey: 'sidebar.integrations', href: '/admin/integrations', icon: TrendingUp },
          { nameKey: 'sidebar.importExport', href: '/admin/import-export', icon: Package },
          { nameKey: 'sidebar.settings', href: '/admin/settings', icon: Settings },
        ] : []),
        { nameKey: 'sidebar.trash', href: '/admin/trash', icon: Trash2 },
      ]
    },
  ];

  // Filter items based on feature access
  return groups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.featureKey && !hasFeature(item.featureKey)) {
        return false;
      }
      return true;
    })
  })).filter(group => group.items.length > 0);
};

const superAdminNavigation: NavItem[] = [
  { nameKey: 'sidebar.platformOverview', href: '/admin/super-dashboard', icon: LayoutDashboard },
  { nameKey: 'sidebar.companyFeatures', href: '/admin/company-features', icon: Settings },
  { nameKey: 'sidebar.companyLiveSupport', href: '/admin/company-live-support', icon: Headphones },
  { nameKey: 'sidebar.liveChats', href: '/admin/live-chats', icon: HeadphonesIcon },
  { nameKey: 'sidebar.chatTickets', href: '/admin/chat-tickets', icon: MessageSquare },
  { nameKey: 'sidebar.createCompany', href: '/admin/create-company', icon: Plus },
  { nameKey: 'sidebar.companyApprovals', href: '/admin/company-approvals', icon: CheckSquare },
  { nameKey: 'sidebar.supportTickets', href: '/admin/support-tickets', icon: Ticket },
  { nameKey: 'sidebar.platformBilling', href: '/admin/platform-billing', icon: DollarSign },
  { nameKey: 'sidebar.promoCodes', href: '/admin/promo-codes', icon: Gift },
];

// Support admin navigation - only support-related items
const supportAdminNavigation: NavItem[] = [
  { nameKey: 'sidebar.liveChats', href: '/admin/live-chats', icon: HeadphonesIcon },
  { nameKey: 'sidebar.chatTickets', href: '/admin/chat-tickets', icon: MessageSquare },
  { nameKey: 'sidebar.supportTickets', href: '/admin/support-tickets', icon: Ticket },
];

const staffNavigation: NavItem[] = [
  { nameKey: 'sidebar.employeePortal', href: '/employee', icon: Briefcase },
];

export const CollapsibleSidebar = ({ isOpen, onClose, supportUnreadCount, liveChatCount = 0, companyLiveSupportCount = 0 }: CollapsibleSidebarProps) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const { signOut, user, isSuperAdmin, isSupportAdmin, isCompanyOwner, userRole, isCompanyAdmin } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const { effectiveCompanyId } = useEffectiveCompanyId();

  const isAdminLevel = isSuperAdmin || isCompanyOwner || isCompanyAdmin || userRole === 'admin';

  // Fetch company logo
  const { data: companyData } = useQuery({
    queryKey: ['company-logo', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', effectiveCompanyId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });

  // Get navigation groups
  const navigationGroups = createNavigationGroups(hasFeature, isAdminLevel);

  // Pages that super admins see in their dedicated section
  const superAdminOnlyPages = ['/admin/live-chats', '/admin/chat-tickets'];

  // Filter out super admin pages from regular navigation
  const filteredGroups = isSuperAdmin 
    ? navigationGroups.map(group => ({
        ...group,
        items: group.items.filter(item => !superAdminOnlyPages.includes(item.href))
      })).filter(group => group.items.length > 0)
    : navigationGroups;

  // Initialize open groups based on current route
  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    filteredGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => location.pathname === item.href);
      if (hasActiveItem || group.defaultOpen) {
        initialOpen[group.nameKey] = true;
      }
    });
    setOpenGroups(prev => ({ ...initialOpen, ...prev }));
  }, []);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Add badge to support items and live chat items
  const addBadgeToItem = (item: NavItem): NavItem => {
    if ((item.href === '/admin/support' && !isSuperAdmin) || 
        (item.href === '/admin/support-tickets' && isSuperAdmin)) {
      return { ...item, badge: supportUnreadCount };
    }
    if (item.href === '/admin/live-chats' && isSuperAdmin) {
      return { ...item, badge: liveChatCount };
    }
    if (item.href === '/admin/company-live-support' && isSuperAdmin) {
      return { ...item, badge: companyLiveSupportCount };
    }
    return item;
  };

  const renderNavItem = (item: NavItem, isActive: boolean) => {
    const itemWithBadge = addBadgeToItem(item);
    
    const content = (
      <Link
        to={item.href}
        onClick={() => onClose()}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", collapsed ? "" : "")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{t(item.nameKey)}</span>
            {itemWithBadge.badge && itemWithBadge.badge > 0 && (
              <Badge 
                variant="destructive" 
                className="h-5 min-w-5 px-1.5 text-xs font-bold"
              >
                {itemWithBadge.badge > 99 ? '99+' : itemWithBadge.badge}
              </Badge>
            )}
          </>
        )}
        {collapsed && itemWithBadge.badge && itemWithBadge.badge > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="relative">{content}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {t(item.nameKey)}
            {itemWithBadge.badge && itemWithBadge.badge > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                {itemWithBadge.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{content}</div>;
  };

  // Map group nameKeys to tour data attributes
  const groupTourMap: Record<string, string> = {
    'sidebar.operations': 'sidebar-operations',
    'sidebar.team': 'sidebar-team',
    'sidebar.salesCrm': 'sidebar-sales',
    'sidebar.projects': 'sidebar-projects',
    'sidebar.financial': 'sidebar-financial',
    'sidebar.resources': 'sidebar-resources',
    'sidebar.design': 'sidebar-design',
    'sidebar.support': 'sidebar-support',
    'sidebar.settings': 'sidebar-settings',
  };

  const renderGroup = (group: NavGroup) => {
    const isGroupOpen = openGroups[group.nameKey] ?? false;
    const hasActiveItem = group.items.some(item => location.pathname === item.href);
    const tourAttribute = groupTourMap[group.nameKey];

    if (collapsed) {
      // In collapsed mode, show group icon with dropdown on hover
      return (
        <Tooltip key={group.nameKey} delayDuration={0}>
          <TooltipTrigger asChild>
            <div
              data-tour={tourAttribute}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all",
                hasActiveItem 
                  ? "bg-sidebar-primary/20 text-sidebar-primary" 
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <group.icon className="h-5 w-5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="p-0 w-48">
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {t(group.nameKey)}
              </div>
              {group.items.map(item => {
                const isActive = location.pathname === item.href;
                const itemWithBadge = addBadgeToItem(item);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                      isActive 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{t(item.nameKey)}</span>
                    {itemWithBadge.badge && itemWithBadge.badge > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                        {itemWithBadge.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible 
        key={group.nameKey} 
        open={isGroupOpen} 
        onOpenChange={() => toggleGroup(group.nameKey)}
      >
        <CollapsibleTrigger className="w-full" data-tour={tourAttribute}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              hasActiveItem 
                ? "text-sidebar-foreground" 
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            <group.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{t(group.nameKey)}</span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isGroupOpen ? "rotate-180" : ""
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
          {group.items.map(item => {
            const isActive = location.pathname === item.href;
            return renderNavItem(item, isActive);
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full transform transition-all duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-64",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-14 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )} data-tour="sidebar-logo">
            {!collapsed && (
              <Link to="/admin" className="flex items-center gap-2">
                {companyData?.logo_url ? (
                  <img 
                    src={companyData.logo_url} 
                    alt={companyData.name || 'Company logo'} 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                    <Ticket className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                )}
                <span className="font-display text-base font-semibold truncate max-w-[160px]">
                  {companyData?.logo_url ? companyData.name : 'TicketPro'}
                </span>
              </Link>
            )}
            {collapsed && (
              companyData?.logo_url ? (
                <img 
                  src={companyData.logo_url} 
                  alt={companyData.name || 'Company logo'} 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-sidebar-primary-foreground" />
                </div>
              )
            )}
            <button 
              onClick={() => onClose()}
              className="lg:hidden p-1.5 hover:bg-sidebar-accent rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Collapse Toggle */}
          <div className={cn(
            "hidden lg:flex items-center border-b border-sidebar-border",
            collapsed ? "justify-center py-2" : "justify-end px-2 py-2"
          )} data-tour="sidebar-collapse">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 hover:bg-sidebar-accent rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto py-3",
            collapsed ? "px-2 space-y-1" : "px-3 space-y-1"
          )}>
            {/* Super Admin Section */}
            {isSuperAdmin && (
              <>
                {!collapsed && (
                  <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    {t('sidebar.superAdmin')}
                  </div>
                )}
                <div className={cn("space-y-0.5", collapsed ? "" : "mb-3")}>
                  {superAdminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return renderNavItem(addBadgeToItem(item), isActive);
                  })}
                </div>
                <div className={cn("border-t border-sidebar-border", collapsed ? "my-2" : "my-3")} />
              </>
            )}

            {/* Support Admin Section */}
            {isSupportAdmin && !isSuperAdmin && (
              <>
                {!collapsed && (
                  <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    Support Admin
                  </div>
                )}
                <div className={cn("space-y-0.5", collapsed ? "" : "mb-3")}>
                  {supportAdminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return renderNavItem(addBadgeToItem(item), isActive);
                  })}
                </div>
                <div className={cn("border-t border-sidebar-border", collapsed ? "my-2" : "my-3")} />
              </>
            )}

            {/* Staff Quick Access */}
            {(userRole === 'staff' || userRole === 'admin') && !isSuperAdmin && (
              <>
                {!collapsed && (
                  <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    Quick Access
                  </div>
                )}
                <div className="space-y-0.5 mb-2">
                  {staffNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return renderNavItem(item, isActive);
                  })}
                </div>
                <div className={cn("border-t border-sidebar-border", collapsed ? "my-2" : "my-3")} />
              </>
            )}

            {/* Grouped Navigation */}
            <div className={cn("space-y-1", collapsed ? "space-y-2" : "")}>
              {filteredGroups.map(group => renderGroup(group))}
            </div>
          </nav>

          {/* User Section */}
          <div className={cn(
            "border-t border-sidebar-border",
            collapsed ? "p-2" : "p-3"
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium shrink-0">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user?.email}</p>
                  <div className="flex gap-1 mt-0.5">
                    {isSuperAdmin && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/30">
                        Super Admin
                      </Badge>
                    )}
                    {isCompanyOwner && !isSuperAdmin && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-success/10 text-success border-success/30">
                        Owner
                      </Badge>
                    )}
                    {!isSuperAdmin && !isCompanyOwner && userRole && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 capitalize">
                        {userRole}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('sidebar.signOut')}</TooltipContent>
              </Tooltip>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 text-xs"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                {t('sidebar.signOut')}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
