import { useState } from "react";
import toast from "react-hot-toast";
import { HiPencilSquare, HiTrash, HiUserPlus } from "react-icons/hi2";
import { createAdminBus, updateAdminBus, deleteAdminBus, bulkDeleteAdminBuses } from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { useLanguage } from "../../../i18n";
import { emptyBusForm } from "../constants";
import { matchesSmartSearch } from "../utils";
import BusForm from "../components/BusForm";
import ModalShell from "../components/ModalShell";

function FleetPage({ buses, drivers, students, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyBusForm);
  const [editingBus, setEditingBus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredBuses = buses.filter((bus) =>
    matchesSmartSearch(search, [bus.name, bus.routeName, bus.plateNumber, bus.driverName])
  );

  const handleDelete = async (busId) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteAdminBus(busId);
      await onRefresh();
      toast.success(t("busDeleted"));
      setSelectedIds((prev) => prev.filter((id) => id !== busId));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${t("deleteConfirm")} (${selectedIds.length})`)) return;
    try {
      await bulkDeleteAdminBuses(selectedIds);
      await onRefresh();
      toast.success(`${selectedIds.length} ${t("busDeleted")}`);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBuses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBuses.map((b) => b.id));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        routeName: form.routeName.trim(),
        plateNumber: form.plateNumber.trim(),
        capacity: Number(form.capacity || 24),
        driverId: form.driverId ? Number(form.driverId) : null,
      };

      if (editingBus) {
        await updateAdminBus(editingBus.id, payload);
        toast.success(t("busUpdated"));
      } else {
        await createAdminBus(payload);
        toast.success(t("busCreated"));
      }

      await onRefresh();
      setEditingBus(null);
      setShowForm(false);
      setForm(emptyBusForm);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PanelCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("fleet")} title={t("fleetTitle")} description={t("fleetDesc")} />
          <div className="flex flex-wrap gap-3">
            <input className="app-input h-10 w-full sm:w-[260px]" placeholder={t("searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <ActionButton onClick={() => { setEditingBus(null); setForm(emptyBusForm); setShowForm(true); }}>
              <HiUserPlus />
              {t("addBus")}
            </ActionButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filteredBuses.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted transition hover:border-accent hover:text-main"
            >
              {selectedIds.length === filteredBuses.length ? t("deselectAll") : t("selectAll")}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/20"
            >
              <HiTrash className="text-sm" />
              {t("delete")} ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredBuses.map((bus) => (
            <div key={bus.id} className={`rounded-[24px] border p-4 transition ${selectedIds.includes(bus.id) ? "border-accent bg-accent/5" : "border-line bg-card-soft"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(bus.id)}
                    onChange={() => toggleSelect(bus.id)}
                    className="mt-1.5 h-4 w-4 rounded border-gray-300 accent-[#71d9cd]"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-main">{bus.name}</h3>
                    <p className="mt-1 text-sm text-muted">{bus.routeName}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                      <span>{bus.plateNumber}</span>
                      <span>{students.filter((student) => student.busId === bus.id).length}/{bus.capacity} {t("seats")}</span>
                      <span>{bus.driverName || t("withoutDriver")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBus(bus);
                      setForm({
                        name: bus.name || "",
                        routeName: bus.routeName || "",
                        plateNumber: bus.plateNumber || "",
                        capacity: String(bus.capacity || 24),
                        driverId: drivers.find((driver) => driver.busId === bus.id)?.id || "",
                      });
                      setShowForm(true);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-main transition hover:border-accent hover:bg-accent-soft"
                  >
                    <HiPencilSquare className="text-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bus.id)}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-red-500 transition hover:border-red-400 hover:bg-red-50"
                  >
                    <HiTrash className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      {showForm ? (
        <ModalShell
          title={editingBus ? `${t("edit")} ${editingBus.name}` : t("addBus")}
          description={t("fleetDesc")}
          onClose={() => setShowForm(false)}
        >
          <BusForm form={form} setForm={setForm} onSubmit={handleSubmit} isSaving={isSaving} drivers={drivers} />
        </ModalShell>
      ) : null}
    </div>
  );
}

export default FleetPage;
