import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { reportsApi } from '@/services/api';
import KpiCard  from '@/components/ui/KpiCard';
import Spinner  from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import { fmt, fmtInt, todayISO, startOfMonth, stockColor } from '@/utils';

const RANGES = [
  { label: 'Today',      from: todayISO(), to: todayISO() },
  { label: 'This Month', from: startOfMonth(), to: todayISO() },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-overlay)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmtInt(payload[0].value)}</div>
      <div style={{ color: 'var(--info)' }}>{payload[1]?.value ?? 0} orders</div>
    </div>
  );
};

export default function DashboardPage() {
  const [rangeIdx, setRangeIdx] = useState(0);
  const range = RANGES[rangeIdx];

  const { data: summaryData, isLoading: sumLoading } = useQuery({
    queryKey: ['report-summary', range.from, range.to],
    queryFn:  () => reportsApi.summary({ from: range.from, to: range.to }),
    staleTime: 60_000,
  });

  const { data: topData } = useQuery({
    queryKey: ['report-top', range.from, range.to],
    queryFn:  () => reportsApi.topProducts({ from: range.from, to: range.to, limit: 8 }),
    staleTime: 60_000,
  });

  const { data: lowData } = useQuery({
    queryKey: ['low-stock'],
    queryFn:  reportsApi.lowStock,
    staleTime: 30_000,
  });

  const summary  = summaryData?.data;
  const topItems = topData?.data ?? [];
  const lowItems = lowData?.data ?? [];
  const daily    = summary?.dailyBreakdown ?? [];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Sales overview and alerts</div>
        </div>
        {/* Range selector */}
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              className={`btn ${i === rangeIdx ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {sumLoading ? (
        <div className="flex gap-3" style={{ justifyContent: 'center', padding: 'var(--sp-8)' }}><Spinner /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
            <KpiCard
              label="Total Revenue"
              value={fmtInt(summary?.totalRevenue ?? 0)}
              sub={`${summary?.totalOrders ?? 0} orders`}
              accent="accent"
            />
            <KpiCard
              label="Avg Order Value"
              value={fmtInt(summary?.avgOrderValue ?? 0)}
              sub={`${summary?.totalItems ?? 0} items sold`}
              accent="info"
            />
            <KpiCard
              label="GST Collected"
              value={fmtInt(summary?.totalTax ?? 0)}
              sub={`Discount: ${fmt(summary?.totalDiscount ?? 0)}`}
              accent="success"
            />
            <KpiCard
              label="Low Stock Alerts"
              value={lowItems.length}
              sub={lowItems.filter(x => x.stockQty <= 0).length + ' out of stock'}
              accent={lowItems.length > 0 ? 'danger' : 'success'}
            />
          </div>

          {/* Charts + Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>

            {/* Daily Revenue Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Revenue by Day</span>
              </div>
              {daily.length === 0 ? (
                <EmptyState icon="◎" title="No data for this range" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,166,35,0.05)' }} />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="orders"  fill="var(--info)"   radius={[3, 3, 0, 0]} hide />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment mode breakdown */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">By Payment Mode</span>
              </div>
              {!summary?.byPaymentMode || Object.keys(summary.byPaymentMode).length === 0 ? (
                <EmptyState icon="◎" title="No payment data" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {Object.entries(summary.byPaymentMode).map(([mode, data]) => {
                    const pct = summary.totalRevenue > 0
                      ? Math.round((data.revenue / summary.totalRevenue) * 100) : 0;
                    return (
                      <div key={mode}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {mode === 'CASH' ? '💵' : mode === 'UPI' ? '📱' : '💳'} {mode}
                          </span>
                          <div style={{ display: 'flex', gap: 'var(--sp-4)', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{data.count} orders</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmtInt(data.revenue)}</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`, borderRadius: 2,
                            background: mode === 'CASH' ? 'var(--success)' : mode === 'UPI' ? 'var(--info)' : 'var(--accent)',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top products */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Top Selling Products</span>
              </div>
              {topItems.length === 0 ? (
                <EmptyState icon="◈" title="No sales yet" />
              ) : (
                <table>
                  <thead>
                    <tr><th>#</th><th>Product</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {topItems.map((p, i) => (
                      <tr key={p.productId}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.78rem', width: 28 }}>
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.sku}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.totalQty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                          {fmtInt(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Low stock list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Low Stock Items</span>
                {lowItems.length > 0 && <Badge variant="danger">{lowItems.length}</Badge>}
              </div>
              {lowItems.length === 0 ? (
                <EmptyState icon="✓" title="All stock levels OK" />
              ) : (
                <table>
                  <thead>
                    <tr><th>Product</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Threshold</th><th>Alert</th></tr>
                  </thead>
                  <tbody>
                    {lowItems.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.sku}</div>
                        </td>
                        <td style={{
                          textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                          color: stockColor(p.stockQty, p.lowStockThreshold),
                        }}>
                          {p.stockQty}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.lowStockThreshold}</td>
                        <td>
                          <Badge variant={p.stockQty <= 0 ? 'danger' : 'warning'}>
                            {p.stockQty <= 0 ? 'OUT' : 'LOW'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}