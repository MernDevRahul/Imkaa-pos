import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { salesApi } from "@/services/api";
import useAuthStore from "@/store/authStore";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InvoiceModal from "@/components/billing/InvoiceModal";
import { fmt, fmtDateTime, todayISO } from "@/utils";

export default function SalesPage() {
  const { isAdmin } = useAuthStore();
  const qc = useQueryClient();

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [page, setPage] = useState(1);
  const [viewSale, setViewSale] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", from, to, page],
    queryFn: () => salesApi.list({ from, to, page, limit: 30 }),
    staleTime: 15_000,
  });

  const sales = data?.data?.sales ?? [];
  const totalPages = Math.ceil((data?.data?.total ?? 0) / 30);
  const totalCount = data?.data?.total ?? 0;

  const voidMutation = useMutation({
    mutationFn: salesApi.void,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["low-stock-count"] });
      toast.success("Sale voided and stock reversed");
    },
    onError: (e) => toast.error(e.message),
  });

  const paymentBadge = (mode) => {
    const map = { CASH: "success", UPI: "info", CARD: "accent" };
    return map[mode] || "neutral";
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Sales History</div>
          <div className="page-subtitle">
            {totalCount} transaction(s) in selected range
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "var(--sp-3)",
          marginBottom: "var(--sp-5)",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div>
          <label className="label">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            style={{ width: 160 }}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            style={{ width: 160 }}
          />
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setFrom(todayISO());
            setTo(todayISO());
            setPage(1);
          }}
        >
          Today
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div
          className="flex gap-3"
          style={{ justifyContent: "center", padding: "var(--sp-8)" }}
        >
          <Spinner /> Loading sales…
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          icon="▤"
          title="No sales found"
          message="Try adjusting the date range"
        />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date & Time</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Discount</th>
                  <th>Grand Total</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--accent)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {s.invoiceNo}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDateTime(s.createdAt)}
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {s.items?.length ?? 0} item(s)
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {fmt(s.subTotal)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--info)",
                      }}
                    >
                      {fmt(s.taxTotal)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        color:
                          Number(s.discountTotal) > 0
                            ? "var(--danger)"
                            : "var(--text-muted)",
                      }}
                    >
                      {Number(s.discountTotal) > 0
                        ? `−${fmt(s.discountTotal)}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {fmt(s.grandTotal)}
                    </td>
                    <td>
                      <Badge variant={paymentBadge(s.paymentMode)}>
                        {s.paymentMode}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        variant={
                          s.status === "COMPLETED" ? "success" : "danger"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewSale(s)}
                        >
                          View
                        </button>
                        {isAdmin() && s.status === "COMPLETED" && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setVoidTarget(s)}
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: "var(--sp-2)",
                marginTop: "var(--sp-4)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Invoice detail/reprint modal */}
      <InvoiceModal
        open={!!viewSale}
        onClose={() => setViewSale(null)}
        sale={viewSale}
      />

      {/* Void confirm */}
      <ConfirmDialog
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={() => voidMutation.mutate(voidTarget.id)}
        title="Void Sale"
        message={`Void "${voidTarget?.invoiceNo}"? Stock will be fully reversed.`}
        confirmLabel="Void Sale"
        danger
      />
    </div>
  );
}
