import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdminShell, PublicShell } from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import {
  AboutPage,
  BookingRequestPage,
  BrowseDressesPage,
  CategoriesPage,
  ContactPage,
  CustomerBookingsPage,
  DressDetailsPage,
  HomePage,
  LoginPage,
  RulesPage
} from "./pages/PublicPages";
import {
  AuditLogsPage,
  BookingsPage,
  CustomersPage,
  DashboardPage,
  DepositsPage,
  ExpensesPage,
  InventoryPage,
  MaintenancePage,
  PaymentsPage,
  PickupPage,
  ReportsPage,
  ReturnsPage,
  SettingsPage,
  StaffRolesPage
} from "./pages/AdminPages";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowseDressesPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="dresses/:id" element={<DressDetailsPage />} />
        <Route path="booking-request" element={<BookingRequestPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="customer-bookings" element={<CustomerBookingsPage />} />
      </Route>

      <Route element={<ProtectedStaffRoute />}>
        <Route element={<AdminShell />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="pickup" element={<PickupPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="deposits" element={<DepositsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="staff" element={<StaffRolesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedStaffRoute() {
  const { configured, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-4 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
          <p className="mt-4 font-semibold text-charcoal/70">Checking staff session...</p>
        </div>
      </div>
    );
  }

  if (!configured || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
