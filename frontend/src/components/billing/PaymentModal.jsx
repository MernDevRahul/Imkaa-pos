import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { fmt, paymentModes } from '@/utils';
import useCartStore from '@/store/cartStore';

export default function PaymentModal({ open, onClose, onConfirm, isLoading }) {
  const { paymentMode, setPaymentMode, totals } = useCartStore();
  const [paidAmount, setPaidAmount] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { grandTotal } = totals();
  const paid   = parseFloat(paidAmount) || 0;
  const change = Math.round((paid - grandTotal) * 100) / 100;

  const handleConfirm = () => {
    if (paid < grandTotal) return;
    onConfirm(paidAmount, customerPhone);
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirm Payment">
      {/* Grand total display */}
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-4)',
        marginBottom: 'var(--sp-4)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Amount to Collect
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
          {fmt(grandTotal)}
        </div>
      </div>

      {/* Payment mode */}
      <div className="field">
        <label className="label">Payment Mode</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-2)' }}>
          {paymentModes.map((m) => (
            <button
              key={m}
              onClick={() => setPaymentMode(m)}
              style={{
                padding: '10px',
                borderRadius: 'var(--r-md)',
                border: '1px solid',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                transition: 'all var(--t-fast)',
                background:   paymentMode === m ? 'var(--accent-ghost)' : 'transparent',
                color:        paymentMode === m ? 'var(--accent)'       : 'var(--text-muted)',
                borderColor:  paymentMode === m ? 'var(--accent)'       : 'var(--border)',
              }}
            >
              {m === 'CASH' ? '💵' : m === 'UPI' ? '📱' : '💳'} {m}
            </button>
          ))}
        </div>
      </div>

      {/* Paid amount */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="field">
          <label className="label">Customer Phone (WhatsApp)</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)' }}
          />
        </div>
        <div className="field">
          <label className="label">Amount Received</label>
          <input
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder={fmt(grandTotal)}
            min={grandTotal}
            step="0.01"
            autoFocus
            style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
            onFocus={(e) => !paidAmount && setPaidAmount(grandTotal.toFixed(2))}
          />
        </div>
      </div>

      {/* Change due — only for cash */}
      {paymentMode === 'CASH' && paid > 0 && (
        <div style={{
          background: change >= 0 ? 'var(--success-dim)' : 'var(--danger-dim)',
          border: `1px solid ${change >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-3) var(--sp-4)',
          marginBottom: 'var(--sp-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            {change >= 0 ? 'CHANGE DUE' : 'SHORTFALL'}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem',
            color: change >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {fmt(Math.abs(change))}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-success flex-1"
          onClick={handleConfirm}
          disabled={paid < grandTotal || isLoading}
          style={{ fontSize: '0.85rem' }}
        >
          {isLoading ? '▸ Processing...' : '✓ Confirm Payment'}
        </button>
      </div>
    </Modal>
  );
}