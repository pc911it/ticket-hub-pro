import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface EmployeeRouteGuardProps {
  children: React.ReactNode;
}

// Routes that employees ARE allowed to access
const EMPLOYEE_ALLOWED_ROUTES = [
  '/employee',
  '/admin/tickets', // Can view their tickets
  '/admin/notifications', // Can see notifications
  '/admin/support', // Can access support
];

// Routes that are completely blocked for employees
const EMPLOYEE_BLOCKED_ROUTES = [
  '/admin/billing',
  '/admin/settings',
  '/admin/users',
  '/admin/payment-settings',
  '/admin/client-billing',
  '/admin/super-dashboard',
  '/admin/platform-billing',
  '/admin/company-approvals',
  '/admin/create-company',
  '/admin/plan-management',
  '/admin/company-features',
  '/admin/promo-codes',
];

export function EmployeeRouteGuard({ children }: EmployeeRouteGuardProps) {
  const { user, loading, isSuperAdmin, isSupportAdmin, isCompanyOwner, isCompanyAdmin, userRole } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkIfEmployee = async () => {
      if (!user || loading) {
        setChecking(false);
        return;
      }

      // Super admins, support admins, company owners, and company admins can access everything
      if (isSuperAdmin || isSupportAdmin || isCompanyOwner || isCompanyAdmin) {
        setIsEmployee(false);
        setChecking(false);
        return;
      }

      // Check if user role indicates employee/staff
      if (userRole === 'staff' || userRole === 'user') {
        setIsEmployee(true);
      } else {
        setIsEmployee(false);
      }

      setChecking(false);
    };

    checkIfEmployee();
  }, [user, loading, isSuperAdmin, isSupportAdmin, isCompanyOwner, isCompanyAdmin, userRole]);

  useEffect(() => {
    if (checking || !isEmployee) return;

    // Check if employee is trying to access a blocked route
    const isBlockedRoute = EMPLOYEE_BLOCKED_ROUTES.some(route => 
      location.pathname.startsWith(route)
    );

    // Check if employee is trying to access admin routes (should go to employee portal)
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isAllowedAdminRoute = EMPLOYEE_ALLOWED_ROUTES.some(route => 
      location.pathname === route || location.pathname.startsWith(route)
    );

    if (isBlockedRoute || (isAdminRoute && !isAllowedAdminRoute)) {
      // Redirect employees to their portal
      navigate('/employee', { replace: true });
    }
  }, [checking, isEmployee, location.pathname, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
