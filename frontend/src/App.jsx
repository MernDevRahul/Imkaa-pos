import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell   from '@/components/layout/AppShell';
import LoginPage  from '@/pages/LoginPage';
import BillingPage    from '@/pages/BillingPage';
import ProductsPage   from '@/pages/ProductsPage';
import InventoryPage  from '@/pages/InventoryPage';
import SalesPage      from '@/pages/SalesPage';
import DashboardPage  from '@/pages/DashboardPage';
import BarcodesPage   from '@/pages/BarcodesPage';
import SettingsPage   from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/billing" replace />} />
        <Route path="/billing"   element={<BillingPage />} />
        <Route path="/products"  element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/sales"     element={<SalesPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/barcodes"  element={<BarcodesPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
}