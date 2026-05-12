import { fmt } from '@/utils';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';

export default function CartItem({ item }) {
  const { updateQty, updatePrice, updateDiscount, removeItem } = useCartStore();
  const { isAdmin } = useAuthStore();

  const { lineTotal } = (() => {
    const lt = Math.round((item.unitPrice * item.qty - item.discount) * 100) / 100;
    return { lineTotal: lt };
  })();

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.product.name}</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'var(--text-muted)', marginTop: 2,
        }}>
          {item.product.sku} · GST {item.product.gstRate}%
        </div>
      </td>

      {/* Unit price — editable for admin */}
      <td>
        {isAdmin() ? (
          <input
            type="number"
            value={item.unitPrice}
            onChange={(e) => updatePrice(item.id, e.target.value)}
            style={{ width: 74, padding: '4px 8px', fontSize: '0.8rem', textAlign: 'right' }}
            min={0}
          />
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(item.unitPrice)}</span>
        )}
      </td>

      {/* Qty stepper */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => updateQty(item.id, item.qty - 1)}
            style={{
              width: 24, height: 24, borderRadius: 'var(--r-sm)',
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >−</button>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700,
            minWidth: 24, textAlign: 'center',
          }}>{item.qty}</span>
          <button
            onClick={() => updateQty(item.id, item.qty + 1)}
            style={{
              width: 24, height: 24, borderRadius: 'var(--r-sm)',
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
        </div>
      </td>

      {/* Discount */}
      <td>
        <input
          type="number"
          value={item.discount}
          onChange={(e) => updateDiscount(item.id, e.target.value)}
          style={{ width: 64, padding: '4px 8px', fontSize: '0.8rem', textAlign: 'right' }}
          min={0}
          placeholder="0"
        />
      </td>

      {/* Line total */}
      <td style={{
        fontFamily: 'var(--font-mono)', fontWeight: 700,
        color: 'var(--accent)', fontSize: '0.9rem',
      }}>
        {fmt(lineTotal)}
      </td>

      {/* Remove */}
      <td>
        <button
          className="btn btn-danger btn-sm btn-icon"
          onClick={() => removeItem(item.id)}
          title="Remove item"
        >✕</button>
      </td>
    </tr>
  );
}