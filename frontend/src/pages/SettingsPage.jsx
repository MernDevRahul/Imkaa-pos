import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { usersApi, categoriesApi } from "@/services/api";
import useAuthStore from "@/store/authStore";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Spinner from "@/components/ui/Spinner";
import { roleLabel } from "@/utils";

const EMPTY_USER = { username: "", name: "", password: "", role: "CASHIER" };

export default function SettingsPage() {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();

  const [tab, setTab] = useState("store");
  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [catName, setCatName] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  // Store config (local state only in v1 — saved to localStorage)
  const [storeConfig, setStoreConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("axispos_store") || "{}");
    } catch {
      return {};
    }
  });
  const [storeSaved, setStoreSaved] = useState(false);

  const saveStoreConfig = () => {
    localStorage.setItem("axispos_store", JSON.stringify(storeConfig));
    setStoreSaved(true);
    setTimeout(() => setStoreSaved(false), 2000);
    toast.success("Store settings saved");
  };

  // Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: tab === "users",
  });
  const users = usersData?.data ?? [];

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      closeUserModal();
      toast.success("User created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, body }) => usersApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      closeUserModal();
      toast.success("User updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
    },
    onError: (e) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User activated");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreateUser = () => {
    setEditUser(null);
    setUserForm(EMPTY_USER);
    setUserModal(true);
  };
  const openEditUser = (u) => {
    setEditUser(u);
    setUserForm({
      username: u.username,
      name: u.name,
      password: "",
      role: u.role,
    });
    setUserModal(true);
  };
  const closeUserModal = () => {
    setUserModal(false);
    setEditUser(null);
  };

  const setUF = (k) => (e) =>
    setUserForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSaveUser = () => {
    if (!userForm.name) return toast.error("Name is required");
    if (editUser) {
      const body = { name: userForm.name, role: userForm.role };
      if (userForm.password) body.password = userForm.password;
      updateUserMutation.mutate({ id: editUser.id, body });
    } else {
      if (!userForm.username || !userForm.password)
        return toast.error("Username and password are required");
      createUserMutation.mutate(userForm);
    }
  };

  // Categories
  const { data: catsData, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
    enabled: tab === "categories",
  });
  const categories = catsData?.data ?? [];

  const createCatMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCatName("");
      toast.success("Category created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "9px 20px",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: tab === id ? "var(--accent-ghost)" : "transparent",
        color: tab === id ? "var(--accent)" : "var(--text-muted)",
        borderBottom: `2px solid ${tab === id ? "var(--accent)" : "transparent"}`,
        transition: "all var(--t-fast)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">
            Store configuration and user management
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          marginBottom: "var(--sp-6)",
          display: "flex",
        }}
      >
        <TabBtn id="store" label="Store" />
        <TabBtn id="users" label="Staff" />
        <TabBtn id="categories" label="Categories" />
      </div>

      {/* Store tab */}
      {tab === "store" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Store Details</span>
          </div>
          {[
            { key: "storeName", label: "Store Name", placeholder: "My Store" },
            { key: "gstin", label: "GSTIN", placeholder: "07ABCDE1234F1Z5" },
            {
              key: "address",
              label: "Address",
              placeholder: "123 Main Road, New Delhi",
            },
            { key: "phone", label: "Phone", placeholder: "+91 98765 43210" },
            {
              key: "invoiceNote",
              label: "Invoice Footer",
              placeholder: "Thank you for your purchase!",
            },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="field">
              <label className="label">{label}</label>
              <input
                value={storeConfig[key] || ""}
                onChange={(e) =>
                  setStoreConfig((c) => ({ ...c, [key]: e.target.value }))
                }
                placeholder={placeholder}
              />
            </div>
          ))}
          <button
            className="btn btn-primary btn-full"
            onClick={saveStoreConfig}
          >
            {storeSaved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "var(--sp-4)",
            }}
          >
            <button className="btn btn-primary" onClick={openCreateUser}>
              + Add Staff
            </button>
          </div>
          {usersLoading ? (
            <div
              className="flex gap-3"
              style={{ justifyContent: "center", padding: "var(--sp-8)" }}
            >
              <Spinner />
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        {u.name}
                        {u.id === currentUser?.id && (
                          <Badge variant="accent" style={{ marginLeft: 8 }}>
                            You
                          </Badge>
                        )}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {u.username}
                      </td>
                      <td>
                        <Badge
                          variant={
                            u.role === "ADMIN"
                              ? "warning"
                              : u.role === "MANAGER"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {roleLabel(u.role)}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={u.isActive ? "success" : "danger"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditUser(u)}
                          >
                            Edit
                          </button>
                          {u.id !== currentUser?.id &&
                            (u.isActive ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeactivateTarget(u)}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => activateMutation.mutate(u.id)}
                                disabled={activateMutation.isPending}
                              >
                                Activate
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Categories tab */}
      {tab === "categories" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: "var(--sp-3)",
              marginBottom: "var(--sp-4)",
            }}
          >
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="New category name…"
              onKeyDown={(e) =>
                e.key === "Enter" &&
                catName.trim() &&
                createCatMutation.mutate({ name: catName.trim() })
              }
            />
            <button
              className="btn btn-primary"
              disabled={!catName.trim() || createCatMutation.isPending}
              onClick={() => createCatMutation.mutate({ name: catName.trim() })}
            >
              Add
            </button>
          </div>
          {catsLoading ? (
            <div
              className="flex gap-3"
              style={{ justifyContent: "center", padding: "var(--sp-6)" }}
            >
              <Spinner />
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteCatMutation.mutate(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      <Modal
        open={userModal}
        onClose={closeUserModal}
        title={editUser ? "Edit Staff" : "Add Staff"}
        footer={
          <>
            <button className="btn btn-ghost flex-1" onClick={closeUserModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleSaveUser}
              disabled={
                createUserMutation.isPending || updateUserMutation.isPending
              }
            >
              {createUserMutation.isPending || updateUserMutation.isPending
                ? "Saving…"
                : "Save"}
            </button>
          </>
        }
      >
        {!editUser && (
          <div className="field">
            <label className="label">Username *</label>
            <input
              value={userForm.username}
              onChange={setUF("username")}
              placeholder="cashier1"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
        )}
        <div className="field">
          <label className="label">Full Name *</label>
          <input
            value={userForm.name}
            onChange={setUF("name")}
            placeholder="Staff member name"
          />
        </div>
        <div className="field">
          <label className="label">
            {editUser ? "New Password (leave blank to keep)" : "Password *"}
          </label>
          <input
            type="password"
            value={userForm.password}
            onChange={setUF("password")}
            placeholder="Min 6 characters"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
        <div className="field">
          <label className="label">Role</label>
          <select value={userForm.role} onChange={setUF("role")}>
            <option value="CASHIER">Cashier</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) {
            deactivateMutation.mutate(deactivateTarget.id);
          }
        }}
        title="Deactivate User"
        message={`Deactivate "${deactivateTarget?.name}"? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
