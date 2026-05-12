import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi, categoriesApi } from "@/services/api";
import useAuthStore from "@/store/authStore";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fmt, stockStatus, GST_RATES } from "@/utils";

const EMPTY_FORM = {
  sku: "",
  name: "",
  categoryId: "",
  costPrice: "",
  sellingPrice: "",
  gstRate: 18,
  stockQty: 0,
  lowStockThreshold: 10,
};

export default function ProductsPage() {
  const { isAdmin, isManager } = useAuthStore();
  const canEdit = isAdmin() || isManager();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterActive, setFilterActive] = useState("true");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [archiveTarget, setArchiveTarget] = useState(null);

  // Queries
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", search, filterCat, filterActive],
    queryFn: () =>
      productsApi.list({ search, categoryId: filterCat, active: filterActive }),
    staleTime: 15_000,
  });
  const products = productsData?.data ?? [];

  const { data: catsData } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });
  const categories = catsData?.data ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Product created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => productsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Product updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: productsApi.archive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product archived");
    },
    onError: (e) => toast.error(e.message),
  });

  const activateMutation = useMutation({
  mutationFn: productsApi.activate,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    toast.success('Product activated');
  },
  onError: (e) => toast.error(e.message),
});

  const openCreate = () => {
    setEditProduct(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId || "",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      gstRate: p.gstRate,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditProduct(null);
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.sku || !form.name || !form.sellingPrice) {
      return toast.error("SKU, name, and selling price are required");
    }
    const body = {
      sku: form.sku.toUpperCase(),
      name: form.name,
      categoryId: form.categoryId || undefined,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice),
      gstRate: parseFloat(form.gstRate) || 0,
      stockQty: parseInt(form.stockQty) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
    };
    if (editProduct) updateMutation.mutate({ id: editProduct.id, body });
    else createMutation.mutate(body);
  };

  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">
            {products.length} product(s) found
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "var(--sp-3)",
          marginBottom: "var(--sp-4)",
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU…"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          style={{ width: 130 }}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div
          className="flex gap-3"
          style={{ padding: "var(--sp-8)", justifyContent: "center" }}
        >
          <Spinner /> Loading products…
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No products found"
          message="Try adjusting your search or filters"
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Price</th>
                <th>GST</th>
                <th>Stock</th>
                <th>Status</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const st = stockStatus(p.stockQty, p.lowStockThreshold);
                return (
                  <tr key={p.id}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.sku}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {catName(p.categoryId)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {fmt(p.costPrice)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {fmt(p.sellingPrice)}
                    </td>
                    <td>
                      <Badge variant="info">{p.gstRate}%</Badge>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          marginRight: 6,
                        }}
                      >
                        {p.stockQty}
                      </span>
                      <Badge variant={st.cls.replace("badge-", "")}>
                        {st.label}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={p.isActive ? "success" : "danger"}>
                        {p.isActive ? "Active" : "Archived"}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </button>
                          {isAdmin() &&
                            (p.isActive ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setArchiveTarget(p)}
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => activateMutation.mutate(p.id)}
                              >
                                Activate
                              </button>
                            ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Form Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editProduct ? "Edit Product" : "New Product"}
        footer={
          <>
            <button className="btn btn-ghost flex-1" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save Product"}
            </button>
          </>
        }
      >
        <div className="field-row cols-2">
          <div className="field">
            <label className="label">SKU *</label>
            <input
              value={form.sku}
              onChange={setF("sku")}
              placeholder="BEV001"
              disabled={!!editProduct}
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div className="field">
            <label className="label">Category</label>
            <select value={form.categoryId} onChange={setF("categoryId")}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Product Name *</label>
          <input
            value={form.name}
            onChange={setF("name")}
            placeholder="Full product name"
          />
        </div>
        <div className="field-row cols-3">
          <div className="field">
            <label className="label">Cost Price</label>
            <input
              type="number"
              value={form.costPrice}
              onChange={setF("costPrice")}
              placeholder="0"
              min={0}
            />
          </div>
          <div className="field">
            <label className="label">Selling Price *</label>
            <input
              type="number"
              value={form.sellingPrice}
              onChange={setF("sellingPrice")}
              placeholder="0"
              min={0}
            />
          </div>
          <div className="field">
            <label className="label">GST Rate</label>
            <select value={form.gstRate} onChange={setF("gstRate")}>
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row cols-2">
          <div className="field">
            <label className="label">Opening Stock</label>
            <input
              type="number"
              value={form.stockQty}
              onChange={setF("stockQty")}
              min={0}
              disabled={!!editProduct}
            />
          </div>
          <div className="field">
            <label className="label">Low Stock Alert</label>
            <input
              type="number"
              value={form.lowStockThreshold}
              onChange={setF("lowStockThreshold")}
              min={0}
            />
          </div>
        </div>
      </Modal>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveMutation.mutate(archiveTarget.id)}
        title="Archive Product"
        message={`Archive "${archiveTarget?.name}"? It will no longer appear in billing.`}
        confirmLabel="Archive"
        danger
      />
    </div>
  );
}
