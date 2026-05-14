import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiPencilSquare, HiTrash, HiUserPlus } from "react-icons/hi2";
import {
  createAdminUser,
  deleteAdminUser,
  disableAdminUser,
  updateAdminUser,
} from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { useLanguage } from "../../../i18n";
import { emptyUserForm } from "../constants";
import { matchesSmartSearch } from "../utils";
import AdminUserForm from "../components/AdminUserForm";
import ModalShell from "../components/ModalShell";

function UsersPage({ admins, drivers, parents, buses, onRefresh }) {
  const { t } = useLanguage();
  const [activeRole, setActiveRole] = useState("admin");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyUserForm);
  const [isSaving, setIsSaving] = useState(false);

  const roleItems = useMemo(() => ({
    admin: admins,
    driver: drivers,
    parent: parents,
  }), [admins, drivers, parents]);

  const currentItems = roleItems[activeRole].filter((item) =>
    matchesSmartSearch(search, [item.name, item.email, item.phone, item.cin, item.status])
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyUserForm);
    setCreating(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      status: user.status || "active",
      cin: user.cin || "",
      busId: user.busId || "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, {
          role: activeRole,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim() || undefined,
          status: form.status,
          cin: form.cin.trim(),
          busId: form.busId ? Number(form.busId) : null,
        });
        toast.success(t("accountUpdated"));
      } else {
        await createAdminUser({
          role: activeRole,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          status: form.status,
          cin: form.cin.trim(),
          busId: form.busId ? Number(form.busId) : null,
        });
        toast.success(t("accountCreatedMsg"));
      }

      await onRefresh();
      setCreating(false);
      setEditingUser(null);
      setForm(emptyUserForm);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async (userId) => {
    try {
      await disableAdminUser(userId);
      await onRefresh();
      toast.success(t("accountDisabled"));
      setEditingUser(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t("deleteConfirm"))) return;

    try {
      await deleteAdminUser(userId);
      await onRefresh();
      toast.success(t("accountDeleted"));
      setEditingUser(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  return (
    <div className="space-y-6">
      <PanelCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("accounts")} title={t("adminsDriversParents")} description={t("centralizedSQL")} />
          <div className="flex flex-wrap gap-3">
            <input className="app-input h-10 w-full sm:w-[260px]" placeholder={t("searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <ActionButton onClick={openCreate}>
              <HiUserPlus />
              {t("addUser")}
            </ActionButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {["admin", "driver", "parent"].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${activeRole === role ? "bg-accent text-slate-950" : "border border-line bg-white text-muted"}`}
            >
              {role === "admin" ? t("admin") : role === "driver" ? t("driver") : t("parent")}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {currentItems.map((user) => (
            <div key={user.id} className="flex flex-col gap-4 rounded-[24px] border border-line bg-card-soft p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-bold text-main">{user.name}</h4>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">{user.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {user.email} - {user.phone || t("phone")}
                  {user.cin ? ` - ${user.cin}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <ActionButton variant="soft" onClick={() => openEdit(user)}>
                  <HiPencilSquare />
                  {t("edit")}
                </ActionButton>
                <ActionButton variant="danger" onClick={() => handleDelete(user.id)}>
                  <HiTrash />
                  {t("delete")}
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      {creating || editingUser ? (
        <ModalShell
          title={editingUser ? `${t("edit")} ${editingUser.name}` : `${t("createAccount")} ${activeRole === "admin" ? t("admin") : activeRole === "driver" ? t("driver") : t("parent")}`}
          description={t("centralizedSQL")}
          onClose={() => {
            setCreating(false);
            setEditingUser(null);
          }}
        >
          <AdminUserForm
            role={activeRole}
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            submitLabel={editingUser ? t("save") : t("createBtn")}
            isSaving={isSaving}
            busOptions={buses}
          />
          {editingUser ? (
            <div className="mt-4 flex justify-end">
              <ActionButton variant="danger" onClick={() => handleDisable(editingUser.id)} disabled={isSaving}>
                {t("disableAccount")}
              </ActionButton>
            </div>
          ) : null}
        </ModalShell>
      ) : null}
    </div>
  );
}

export default UsersPage;
