import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompanyRegister from "./pages/CompanyRegister";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import DispatcherDashboard from "./pages/admin/DispatcherDashboard";
import NewCallPage from "./pages/admin/NewCallPage";
import NotificationsPage from "./pages/admin/NotificationsPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import UpdatesPage from "./pages/admin/UpdatesPage";
import CalendarPage from "./pages/admin/CalendarPage";
import ClientsPage from "./pages/admin/ClientsPage";
import TicketsPage from "./pages/admin/TicketsPage";
import UsersPage from "./pages/admin/UsersPage";
import BillingPage from "./pages/admin/BillingPage";

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

  return <>{children}</>;
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
                    <BillingPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
