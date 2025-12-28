import { useAuth } from '@/hooks/useAuth';

export function useEmployeeRestrictions() {
  const { userRole, isCompanyOwner, isSuperAdmin } = useAuth();
  
  // Check if user is an employee with restricted access
  const isEmployee = userRole === 'staff' || userRole === 'user';
  const isAdmin = userRole === 'admin' || isCompanyOwner || isSuperAdmin;
  
  // Employees can create and view, but not edit or delete
  const canCreate = true;
  const canView = true;
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  
  // Specific page restrictions
  const canAccessBilling = isAdmin;
  const canAccessSettings = isAdmin;
  const canAccessUsers = isAdmin;
  
  // Areas employees CAN access
  const canAccessTickets = true;
  const canAccessProjects = true;
  const canAccessClients = true;
  const canAccessEmployees = true;
  const canAccessCalendar = true;
  const canAccessInventory = true;
  const canAccessNotifications = true;
  const canAccessSupport = true;
  
  return {
    isEmployee,
    isAdmin,
    canCreate,
    canView,
    canEdit,
    canDelete,
    canAccessBilling,
    canAccessSettings,
    canAccessUsers,
    canAccessTickets,
    canAccessProjects,
    canAccessClients,
    canAccessEmployees,
    canAccessCalendar,
    canAccessInventory,
    canAccessNotifications,
    canAccessSupport,
  };
}
