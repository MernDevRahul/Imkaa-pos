import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Sidebar from './Sidebar';

export default function AppShell() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}