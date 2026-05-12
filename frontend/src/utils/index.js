// ── Currency ─────────────────────────────────────────────────────────────────
export const fmt = (n, decimals = 2) =>
  '₹' + Number(n || 0).toFixed(decimals);

export const fmtInt = (n) =>
  '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

// ── Dates ─────────────────────────────────────────────────────────────────────
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

export const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

// ── Stock helpers ─────────────────────────────────────────────────────────────
export const stockStatus = (qty, threshold) => {
  if (qty <= 0)         return { label: 'OUT', cls: 'badge-danger' };
  if (qty <= threshold) return { label: 'LOW', cls: 'badge-warning' };
  return                       { label: 'OK',  cls: 'badge-success' };
};

export const stockColor = (qty, threshold) => {
  if (qty <= 0)         return 'var(--danger)';
  if (qty <= threshold) return 'var(--warning)';
  return                       'var(--success)';
};

// ── GST ───────────────────────────────────────────────────────────────────────
export const GST_RATES = [0, 5, 12, 18, 28];

// ── Misc ──────────────────────────────────────────────────────────────────────
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const paymentModes = ['CASH', 'UPI', 'CARD'];

export const roleLabel = (role) =>
  ({ ADMIN: 'Admin', MANAGER: 'Manager', CASHIER: 'Cashier' }[role] ?? role);