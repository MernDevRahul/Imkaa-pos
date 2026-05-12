import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi, barcodesApi } from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function BarcodesPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // { productId: copies }
  const [cols, setCols] = useState(3);
  const [previewId, setPreviewId] = useState(null);
  const [previewSvg, setPreviewSvg] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", search, "", "true"],
    queryFn: () => productsApi.list({ search, active: true }),
    staleTime: 30_000,
  });
  const products = productsData?.data ?? [];

  const toggleSelect = (id) => {
    setSelected((s) => {
      if (s[id]) {
        const n = { ...s };
        delete n[id];
        return n;
      }
      return { ...s, [id]: 1 };
    });
  };

  const setCopies = (id, val) => {
    const n = Math.max(1, Math.min(100, parseInt(val) || 1));
    setSelected((s) => ({ ...s, [id]: n }));
  };

  const selectedCount = Object.keys(selected).length;
  const totalLabels = Object.values(selected).reduce((a, b) => a + b, 0);

  // Preview single barcode
  const handlePreview = async (product) => {
    if (previewId === product.id) {
      setPreviewId(null);
      setPreviewSvg("");
      return;
    }

    setPreviewId(product.id);
    setLoadingPreview(true);
    setPreviewSvg("");

    try {
      const res = await fetch(barcodesApi.svgUrl(product.id), {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch barcode");
      }

      const svg = await res.text();
      setPreviewSvg(svg);
    } catch (e) {
      toast.error(e.message || "Failed to load barcode");
      setPreviewId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Print custom sheet for selected products
  const handlePrintSheet = async () => {
    if (selectedCount === 0) return toast.error("Select at least one product");
    const body = {
      products: Object.entries(selected).map(([productId, copies]) => ({
        productId,
        copies,
      })),
      cols,
    };
    try {
      const html = await barcodesApi.sheet(body);
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Print sheet for ALL active products
  const handlePrintAll = async () => {
  try {
    const html = await barcodesApi.sheetAll(cols);

    const w = window.open("", "_blank");

    w.document.write(html);
    w.document.close();
    w.focus();
  } catch (e) {
    toast.error(e.message || "Failed to generate sheet");
  }
};

  const selectAll = () => {
    const all = {};
    products.forEach((p) => {
      all[p.id] = selected[p.id] || 1;
    });
    setSelected(all);
  };

  const clearAll = () => setSelected({});
  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Barcodes</div>
          <div className="page-subtitle">
            Generate and print barcode labels (Code128B · SKU-based)
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <button className="btn btn-ghost" onClick={handlePrintAll}>
            ⎙ Print All Active
          </button>
          <button
            className="btn btn-primary"
            disabled={selectedCount === 0}
            onClick={handlePrintSheet}
          >
            ⎙ Print Selected ({totalLabels} label{totalLabels !== 1 ? "s" : ""})
          </button>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "var(--sp-3)",
          marginBottom: "var(--sp-4)",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{ flex: 1, minWidth: 200 }}
        />
        <div>
          <label className="label">Columns per row</label>
          <select
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            style={{ width: 80 }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={selectAll}>
          Select All
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={clearAll}
          disabled={selectedCount === 0}
        >
          Clear
        </button>
      </div>

      {/* Selection summary */}
      {selectedCount > 0 && (
        <div
          style={{
            background: "var(--accent-ghost)",
            border: "1px solid rgba(245,166,35,0.3)",
            borderRadius: "var(--r-md)",
            padding: "var(--sp-3) var(--sp-4)",
            marginBottom: "var(--sp-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            color: "var(--accent)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse 2s infinite",
              flexShrink: 0,
            }}
          />
          {selectedCount} product(s) selected · {totalLabels} label(s) will be
          printed
        </div>
      )}

      {/* Product list */}
      {isLoading ? (
        <div
          className="flex gap-3"
          style={{ justifyContent: "center", padding: "var(--sp-8)" }}
        >
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon="▦" title="No products found" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedCount === products.length && products.length > 0
                    }
                    onChange={(e) =>
                      e.target.checked ? selectAll() : clearAll()
                    }
                    style={{ width: "auto", cursor: "pointer" }}
                  />
                </th>
                <th>SKU</th>
                <th>Product</th>
                <th>Price</th>
                <th>Copies</th>
                <th>Barcode Preview</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isChecked = !!selected[p.id];
                const isPreviewing = previewId === p.id;

                return (
                  <>
                    <tr
                      key={p.id}
                      style={{
                        background: isChecked
                          ? "var(--accent-ghost)"
                          : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(p.id)}
                          style={{ width: "auto", cursor: "pointer" }}
                        />
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8rem",
                          color: "var(--accent)",
                        }}
                      >
                        {p.sku}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {p.category?.name || "—"}
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        ₹{Number(p.sellingPrice).toFixed(2)}
                      </td>
                      <td>
                        {isChecked ? (
                          <input
                            type="number"
                            value={selected[p.id]}
                            onChange={(e) => setCopies(p.id, e.target.value)}
                            style={{
                              width: 64,
                              padding: "4px 8px",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.82rem",
                            }}
                            min={1}
                            max={100}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.78rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${isPreviewing ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => handlePreview(p)}
                        >
                          {loadingPreview && isPreviewing ? (
                            <Spinner size={14} />
                          ) : (
                            "▦ Preview"
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Inline SVG preview row */}
                    {isPreviewing && previewSvg && (
                      <tr key={`${p.id}-preview`}>
                        <td
                          colSpan={6}
                          style={{
                            background: "var(--bg-raised)",
                            padding: "var(--sp-4)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "var(--sp-6)",
                            }}
                          >
                            {/* SVG */}
                            <div
                              dangerouslySetInnerHTML={{ __html: previewSvg }}
                              style={{
                                background: "#fff",
                                padding: "var(--sp-3)",
                                borderRadius: "var(--r-md)",
                                border: "1px solid var(--border)",
                                display: "inline-block",
                              }}
                            />
                            {/* Info */}
                            <div
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.78rem",
                              }}
                            >
                              <div
                                style={{
                                  color: "var(--text-muted)",
                                  marginBottom: 4,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  fontSize: "0.68rem",
                                }}
                              >
                                Barcode Details
                              </div>
                              <div
                                style={{
                                  color: "var(--text-primary)",
                                  marginBottom: 2,
                                }}
                              >
                                Encoding: <strong>Code128B</strong>
                              </div>
                              <div
                                style={{
                                  color: "var(--text-primary)",
                                  marginBottom: 2,
                                }}
                              >
                                Data:{" "}
                                <strong style={{ color: "var(--accent)" }}>
                                  {p.sku}
                                </strong>
                              </div>
                              <div
                                style={{
                                  color: "var(--text-primary)",
                                  marginBottom: 8,
                                }}
                              >
                                Product: {p.name}
                              </div>
                              <Badge variant="success">Scannable ✓</Badge>
                              <div
                                style={{
                                  marginTop: "var(--sp-3)",
                                  display: "flex",
                                  gap: "var(--sp-2)",
                                }}
                              >
                                {!isChecked && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => toggleSelect(p.id)}
                                  >
                                    + Add to Sheet
                                  </button>
                                )}
                                <a
                                  href={barcodesApi.svgUrl(p.id)}
                                  download={`${p.sku}.svg`}
                                  className="btn btn-ghost btn-sm"
                                  style={{ textDecoration: "none" }}
                                >
                                  ↓ Download SVG
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
