import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { ApprovalGuard } from "@/components/ApprovalGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompanyRegister from "./pages/CompanyRegister";
import UpgradePage from "./pages/UpgradePage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import DispatcherDashboard from "./pages/admin/DispatcherDashboard";
import NewCallPage from "./pages/admin/NewCallPage";
import NotificationsPage from "./pages/admin/NotificationsPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import UpdatesPage from "./pages/admin/UpdatesPage";
import CalendarPage from "./pages/admin/CalendarPage";
import ClientsPage from "./pages/admin/ClientsPage";
import ProjectsPage from "./pages/admin/ProjectsPage";
import ProjectDashboardPage from "./pages/admin/ProjectDashboardPage";
import TicketsPage from "./pages/admin/TicketsPage";
import UsersPage from "./pages/admin/UsersPage";
import BillingPage from "./pages/admin/BillingPage";
import BillingSettingsPage from "./pages/admin/BillingSettingsPage";
import CompanySettingsPage from "./pages/admin/CompanySettingsPage";
import InventoryPage from "./pages/admin/InventoryPage";
import InventoryReportsPage from "./pages/admin/InventoryReportsPage";
import PurchaseOrdersPage from "./pages/admin/PurchaseOrdersPage";
import SuppliersPage from "./pages/admin/SuppliersPage";
import CompanyApprovalsPage from "./pages/admin/CompanyApprovalsPage";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import SuperAdminBillingPage from "./pages/admin/SuperAdminBillingPage";
import AgentJobPage from "./pages/AgentJobPage";
import ClientDashboard from "./pages/ClientDashboard";
import TrashPage from "./pages/admin/TrashPage";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SubscriptionGuard>
      <ApprovalGuard>
        {children}
      </ApprovalGuard>
    </SubscriptionGuard>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register-company" element={<CompanyRegister />} />
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DispatcherDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/new-call"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <NewCallPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <NotificationsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <EmployeesPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/updates"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <UpdatesPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/calendar"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CalendarPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ClientsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ProjectsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/projects/:projectId"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ProjectDashboardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tickets"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TicketsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <UsersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/billing"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <BillingSettingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CompanySettingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <InventoryPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory/reports"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <InventoryReportsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory/orders"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <PurchaseOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory/suppliers"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SuppliersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/company-approvals"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CompanyApprovalsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/super-dashboard"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SuperAdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/platform-billing"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SuperAdminBillingPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trash"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TrashPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent"
              element={
                <ProtectedRoute>
                  <AgentJobPage />
                </ProtectedRoute>
              }
            />
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
