import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi, salesApi } from "@/services/api";
import useCartStore from "@/store/cartStore";
import useAuthStore from "@/store/authStore";
import CartItem from "@/components/billing/CartItem";
import BarcodeScanner from "@/components/billing/BarcodeScanner";
import PaymentModal from "@/components/billing/PaymentModal";
import InvoiceModal from "@/components/billing/InvoiceModal";
import EmptyState from "@/components/ui/EmptyState";
import { fmt } from "@/utils";

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const searchRef = useRef();
  const qc = useQueryClient();

  const {
    items,
    addItem,
    clearCart,
    setBillDiscount,
    billDiscount,
    totals,
    toSalePayload,
  } = useCartStore();
  const { isAdmin } = useAuthStore();
  const { subTotal, taxTotal, grandTotal } = totals();

  // Search products
  const { data: searchData } = useQuery({
    queryKey: ["products-search", search],
    queryFn: () => productsApi.list({ search, active: true }),
    enabled: search.length > 0,
    staleTime: 10_000,
  });
  const searchResults = searchData?.data?.slice(0, 8) ?? [];

  // Resolve SKU (for Enter key / barcode scan)
  const resolveSku = useCallback(
    async (sku) => {
      try {
        const res = await productsApi.resolveSku(sku.trim().toUpperCase());
        addItem(res.data);
        setSearch("");
        searchRef.current?.focus();
      } catch {
        toast.error(`SKU not found: ${sku}`);
      }
    },
    [addItem],
  );

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim()) {
      if (searchResults.length === 1) {
        addItem(searchResults[0]);
        setSearch("");
      } else {
        resolveSku(search.trim());
      }
    }
    if (e.key === "Escape") setSearch("");
  };

  const handleScanDetect = useCallback(
    (sku) => {
      setShowScanner(false);
      resolveSku(sku);
      toast.success(`Scanned: ${sku}`, { duration: 1500 });
    },
    [resolveSku],
  );

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (res) => {
      setLastSale(res.data);
      clearCart();
      setShowPayment(false);
      setShowInvoice(true);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["low-stock-count"] });
      toast.success(`Sale complete — ${res.data.invoiceNo}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirmPayment = (paidAmount, customerPhone) => {
    const payload = toSalePayload(paidAmount);
    payload.customerPhone = customerPhone;
    createSaleMutation.mutate(payload);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── LEFT: Product search + Cart ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: "var(--sp-4)",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  fontSize: "1rem",
                  pointerEvents: "none",
                }}
              >
                ▦
              </span>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Scan barcode or search product — press Enter to add"
                style={{
                  paddingLeft: 36,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
                autoFocus
              />
            </div>
            <button
              className={`btn ${showScanner ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setShowScanner((v) => !v)}
              title="Toggle webcam scanner"
            >
              📷
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
            >
              Clear
            </button>
          </div>

          {/* Scanner */}
          {showScanner && (
            <div style={{ marginTop: "var(--sp-3)" }}>
              <BarcodeScanner
                onDetect={handleScanDetect}
                onClose={() => setShowScanner(false)}
              />
            </div>
          )}

          {/* Search dropdown */}
          {search && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: "var(--sp-4)",
                right: "calc(340px + var(--sp-4))",
                top: showScanner ? 320 : 74,
                background: "var(--bg-raised)",
                border: "1px solid var(--border-hover)",
                borderRadius: "var(--r-md)",
                zIndex: 50,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                overflow: "hidden",
                marginLeft: "var(--sidebar-w)"
              }}
            >
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    addItem(p);
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "background var(--t-fast)",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}
                    >
                      {p.sku} · GST {p.gstRate}%
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                      marginLeft: "var(--sp-4)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {fmt(p.sellingPrice)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color:
                          p.stockQty <= p.lowStockThreshold
                            ? "var(--warning)"
                            : "var(--text-muted)",
                      }}
                    >
                      Stock: {p.stockQty}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart table */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          {items.length === 0 ? (
            <EmptyState
              icon="▦"
              title="Cart is empty"
              message="Scan a barcode or search for a product to add it to the cart"
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Disc (₹)</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── RIGHT: Bill summary + actions ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          padding: "var(--sp-5)",
          gap: "var(--sp-4)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Bill Summary
        </div>

        {/* Totals */}
        <div style={{ flex: 1 }}>
          {[
            { label: "Items", value: items.reduce((s, x) => s + x.qty, 0) },
            { label: "Subtotal", value: fmt(subTotal) },
            { label: "GST", value: fmt(taxTotal), color: "var(--info)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: color || "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {value}
              </span>
            </div>
          ))}

          {/* Bill discount input */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
              }}
            >
              Bill Disc (₹)
            </span>
            <input
              type="number"
              value={billDiscount}
              onChange={(e) => setBillDiscount(e.target.value)}
              style={{
                width: 80,
                textAlign: "right",
                padding: "4px 8px",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
              }}
              min={0}
              placeholder="0"
            />
          </div>

          {/* Grand total */}
          <div style={{ paddingTop: "var(--sp-4)", textAlign: "center" }}>
            <div
              style={{
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Grand Total
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "2.4rem",
                fontWeight: 700,
                color: "var(--accent)",
                lineHeight: 1,
              }}
            >
              {fmt(grandTotal)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-2)",
          }}
        >
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={items.length === 0}
            onClick={() => setShowPayment(true)}
          >
            ▸ Pay {fmt(grandTotal)}
          </button>
          <button
            className="btn btn-ghost btn-full btn-sm"
            disabled={items.length === 0}
            onClick={() => {
              clearCart();
              toast.success("Cart cleared");
            }}
          >
            ✕ Clear Cart
          </button>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
        isLoading={createSaleMutation.isPending}
      />
      <InvoiceModal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        sale={lastSale}
      />
    </div>
  );
}
