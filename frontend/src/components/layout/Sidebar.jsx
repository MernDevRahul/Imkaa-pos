import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';
import { authApi, reportsApi } from '@/services/api';
import ThemeToggle from './ThemeToggle';
import { fmtDate } from '@/utils';

const NAV = [
  { to: '/billing',   icon: '⬡', label: 'Billing'   },
  { to: '/products',  icon: '◈', label: 'Products'  },
  { to: '/inventory', icon: '◉', label: 'Inventory' },
  { to: '/sales',     icon: '▤', label: 'Sales'     },
  { to: '/dashboard', icon: '◎', label: 'Dashboard' },
  { to: '/barcodes',  icon: '▦', label: 'Barcodes'  },
];

const ADMIN_NAV = [
  { to: '/settings', icon: '◈', label: 'Settings' },
];

export default function Sidebar() {
  const { user, clearAuth, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn:  () => reportsApi.lowStock(),
    refetchInterval: 60_000,
  });

  const lowStockCount = lowStockData?.data?.length ?? 0;

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });

  const handleLogout = () => {
    toast.promise(logoutMutation.mutateAsync(), {
      loading: 'Signing out...',
      success: 'Signed out',
      error:   'Signed out',   // always clear regardless
    });
  };

  const navItems = isAdmin() ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          IMKAA<span>Store</span>
        </div>
        <div className="sidebar-user">
          {user?.role} · {user?.name}
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
            {item.to === '/inventory' && lowStockCount > 0 && (
              <span className="nav-badge">{lowStockCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          marginBottom: 'var(--sp-3)',
          letterSpacing: '0.06em',
        }}>
          {fmtDate(new Date())}
        </div>
        
        <ThemeToggle />
        
        <div style={{ margin: 'var(--sp-4) 0' }}>
          <button
            className="btn btn-ghost btn-full btn-sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            ⎋ Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}