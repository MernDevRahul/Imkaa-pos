import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (body) => authApi.login(body),
    onSuccess: (res) => {
      setAuth(res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}`);
      navigate('/billing');
    },
    onError: (err) => {
      toast.error(err.message)
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Enter username and password');
    loginMutation.mutate({ username, password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-5)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--accent)',
            lineHeight: 1,
          }}>
            AXIS<span style={{ color: 'var(--text-primary)' }}>POS</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}>
            Point of Sale System v1.0
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-6)',
          boxShadow: '0 0 40px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 'var(--sp-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6,
              borderRadius: '50%', background: 'var(--success)',
              animation: 'pulse 2s ease infinite',
            }} />
            Staff Authentication
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                autoComplete="username"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="field">
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loginMutation.isPending}
              style={{ marginTop: 'var(--sp-2)', padding: '11px' }}
            >
              {loginMutation.isPending ? '▸ Authenticating...' : '▸ Sign In'}
            </button>
          </form>

          {/* Hint box */}
          <div style={{
            marginTop: 'var(--sp-5)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            lineHeight: 1.8,
          }}>
            <div>admin / admin123 <span style={{ color: 'var(--accent)' }}>← ADMIN</span></div>
            <div>cashier1 / cashier123 <span style={{ color: 'var(--info)' }}>← CASHIER</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}