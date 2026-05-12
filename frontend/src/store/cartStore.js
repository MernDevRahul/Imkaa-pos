import { create } from 'zustand';

// ── Tax helper (GST-inclusive) ────────────────────────────────────────────────
// const calcLine = (unitPrice, qty, discount, gstRate) => {
//   const lineTotal    = Math.round((unitPrice * qty - (discount || 0)) * 100) / 100;
//   const rate         = gstRate / 100;
//   const taxableValue = rate > 0 ? Math.round((lineTotal / (1 + rate)) * 100) / 100 : lineTotal;
//   const taxAmount    = Math.round((lineTotal - taxableValue) * 100) / 100;
//   return { lineTotal, taxAmount };
// };
const calcLine = (
  unitPrice,
  qty,
  discount = 0,
  gstRate = 0
) => {
  // Base amount before GST
  const taxableValue = r2(unitPrice * qty - discount);

  // GST amount
  const taxAmount = r2(
    taxableValue * (gstRate / 100)
  );

  // Final amount including GST
  const lineTotal    = Math.round((unitPrice * qty - (discount || 0)) * 100) / 100;

  return {
    qty,
    unitPrice,
    discount,
    gstRate,

    taxableValue,
    taxAmount,
    lineTotal,
  };
};

const r2 = (n) => Math.round(n * 100) / 100;

const useCartStore = create((set, get) => ({
  items:        [],
  billDiscount: 0,
  paymentMode:  'CASH',

  // ── Mutations ──────────────────────────────────────────────────────────────
  addItem: (product) => {
    set((s) => {
      const existing = s.items.find((x) => x.productId === product.id);
      if (existing) {
        return {
          items: s.items.map((x) =>
            x.productId === product.id ? { ...x, qty: x.qty + 1 } : x
          ),
        };
      }
      return {
        items: [
          ...s.items,
          {
            id:          crypto.randomUUID(),
            productId:   product.id,
            product,
            qty:         1,
            unitPrice:   Number(product.sellingPrice),
            discount:    0,
          },
        ],
      };
    });
  },

  updateQty: (id, qty) => {
    if (qty < 1) return;
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, qty } : x)) }));
  },

  updatePrice: (id, unitPrice) => {
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, unitPrice: Number(unitPrice) } : x)) }));
  },

  updateDiscount: (id, discount) => {
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, discount: Number(discount) } : x)) }));
  },

  removeItem: (id) => {
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
  },

  setBillDiscount: (v) => set({ billDiscount: Number(v) || 0 }),
  setPaymentMode:  (v) => set({ paymentMode: v }),

  clearCart: () => set({ items: [], billDiscount: 0, paymentMode: 'CASH' }),

  // ── Computed totals ────────────────────────────────────────────────────────
  totals: () => {
    const { items, billDiscount } = get();
    let subTotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const { lineTotal, taxAmount } = calcLine(
        item.unitPrice, item.qty, item.discount,
        Number(item.product.gstRate)
      );
      subTotal += lineTotal;
      taxTotal += taxAmount;
    }

    subTotal = r2(subTotal);
    taxTotal = r2(taxTotal);
    const grandTotal = r2(subTotal - billDiscount + taxTotal);

    return { subTotal, taxTotal, billDiscount, grandTotal };
  },

  // ── Payload for POST /sales ────────────────────────────────────────────────
  toSalePayload: (paidAmount) => {
    const { items, billDiscount, paymentMode } = get();
    return {
      items: items.map((x) => ({
        productId: x.productId,
        qty:       x.qty,
        unitPrice: x.unitPrice,
        discount:  x.discount,
      })),
      billDiscount,
      paymentMode,
      paidAmount: Number(paidAmount),
    };
  },
}));

export default useCartStore;