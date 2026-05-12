import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inventoryApi } from '@/services/api';
import useAuthStore from '@/store/authStore';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { stockStatus, stockColor, fmtDateTime } from '@/utils';

export default function InventoryPage() {
  const { isAdmin, isManager } = useAuthStore();
  const canAdjust = isAdmin() || isManager();
  const qc = useQueryClient();

  const [tab, setTab]             = useState('overview'); // overview | movements
  const [adjustTarget, setAdjust] = useState(null);
  const [adjQty, setAdjQty]       = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [movFilter, setMovFilter] = useState('');
  const [search, setSearch]       = useState('');

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn:  inventoryApi.overview,
    refetchInterval: 30_000,
  });
  const allProducts = overviewData?.data ?? [];

  const products = allProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const { data: movData, isLoading: movLoading } = useQuery({
    queryKey: ['movements', movFilter],
    queryFn:  () => inventoryApi.movements({ productId: movFilter || undefined, limit: 100 }),
    enabled:  tab === 'movements',
  });
  const movements = movData?.data ?? [];

  const { data: lowData } = useQuery({
    queryKey: ['low-stock'],
    queryFn:  inventoryApi.lowStock,
    staleTime: 30_000,
  });
  const lowStock = lowData?.data ?? [];

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['low-stock-count'] });
      setAdjust(null); setAdjQty(''); setAdjReason('');
      toast.success('Stock adjusted');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAdjust = () => {
    if (!adjQty || adjQty === '0') return toast.error('Enter a non-zero quantity');
    if (!adjReason.trim()) return toast.error('Reason is required');
    adjustMutation.mutate({ productId: adjustTarget.id, qtyDelta: parseInt(adjQty), reason: adjReason });
  };

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '8px 20px', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        background: tab === id ? 'var(--accent-ghost)' : 'transparent',
        color:      tab === id ? 'var(--accent)'       : 'var(--text-muted)',
        borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
        transition: 'all var(--t-fast)',
      }}
    >{label}</button>
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Inventory</div>
          <div className="page-subtitle">Stock levels and movement log</div>
        </div>

        <div className="flex gap-2" style={{ minWidth: 320 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, fontSize: '0.82rem' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  padding: 4, fontSize: '0.8rem'
                }}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--sp-2)' }}>
            ⚠ {lowStock.length} item(s) need restocking
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {lowStock.map((p) => (
              <span key={p.id} style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 'var(--r-sm)', padding: '2px 10px',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--danger)',
              }}>
                {p.name} — <strong>{p.stockQty}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 'var(--sp-5)', display: 'flex' }}>
        <TabBtn id="overview"  label="Stock Overview" />
        <TabBtn id="movements" label="Movement Log" />
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        isLoading ? (
          <div className="flex gap-3" style={{ justifyContent: 'center', padding: 'var(--sp-8)' }}><Spinner /> Loading…</div>
        ) : allProducts.length === 0 ? (
          <EmptyState icon="◉" title="No active products" />
        ) : products.length === 0 ? (
          <EmptyState icon="🔍" title="No matching products found" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Product</th><th>Category</th>
                  <th>In Stock</th><th>Threshold</th><th>Status</th>
                  {canAdjust && <th></th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = stockStatus(p.stockQty, p.lowStockThreshold);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.sku}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{p.category?.name || '—'}</td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem',
                          color: stockColor(p.stockQty, p.lowStockThreshold),
                        }}>
                          {p.stockQty}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.lowStockThreshold}</td>
                      <td><Badge variant={st.cls.replace('badge-', '')}>{st.label}</Badge></td>
                      {canAdjust && (
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setAdjust(p); setAdjQty(''); setAdjReason(''); }}>
                            Adjust
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div>
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <select value={movFilter} onChange={(e) => setMovFilter(e.target.value)} style={{ width: 220 }}>
              <option value="">All Products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {movLoading ? (
            <div className="flex gap-3" style={{ justifyContent: 'center', padding: 'var(--sp-8)' }}><Spinner /></div>
          ) : movements.length === 0 ? (
            <EmptyState icon="▤" title="No movements found" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>Product</th><th>Type</th><th>Qty Change</th><th>Stock After</th><th>Reason</th><th>By</th></tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(m.createdAt)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{m.product?.name}</td>
                      <td><Badge variant={m.type === 'SALE' ? 'info' : 'warning'}>{m.type}</Badge></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.qtyDelta > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {m.qtyDelta > 0 ? '+' : ''}{m.qtyDelta}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{m.stockAfter}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.reason}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.createdBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjust Modal */}
      <Modal
        open={!!adjustTarget} onClose={() => setAdjust(null)}
        title="Adjust Stock"
        footer={
          <>
            <button className="btn btn-ghost flex-1" onClick={() => setAdjust(null)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={handleAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Saving…' : 'Save Adjustment'}
            </button>
          </>
        }
      >
        {adjustTarget && (
          <>
            <div style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--bg-raised)', borderRadius: 'var(--r-md)', fontSize: '0.85rem' }}>
              <strong>{adjustTarget.name}</strong>
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{adjustTarget.sku}</span>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Current stock: <strong style={{ color: stockColor(adjustTarget.stockQty, adjustTarget.lowStockThreshold) }}>{adjustTarget.stockQty}</strong>
              </div>
            </div>
            <div className="field">
              <label className="label">Quantity Change (use − to decrease)</label>
              <input
                type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)}
                placeholder="+10 to add, −5 to remove" autoFocus
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div className="field">
              <label className="label">Reason *</label>
              <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Purchase / Damage / Correction…" />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}