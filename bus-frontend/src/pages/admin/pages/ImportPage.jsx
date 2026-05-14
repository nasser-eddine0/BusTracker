import { useState } from "react";
import toast from "react-hot-toast";
import { HiCloudUpload } from "react-icons/hi";
import { HiPencilSquare, HiUserPlus, HiTrash } from "react-icons/hi2";
import {
  createAdminStudent,
  updateAdminStudent,
  deleteAdminStudent,
  bulkDeleteAdminStudents,
} from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { useLanguage } from "../../../i18n";
import { emptyStudentForm } from "../constants";
import { matchesSmartSearch } from "../utils";
import ModalShell from "../components/ModalShell";
import StudentForm from "../components/StudentForm";
import ImportStudentsTab from "../components/ImportStudentsTab";

function ImportPage({ students, parents, buses, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyStudentForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: "", ids: [] });

  const filteredStudents = students.filter((student) =>
    matchesSmartSearch(search, [student.name, student.grade, student.address, student.parentName])
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        grade: form.grade.trim() || null,
        address: form.address.trim() || null,
        regCode: form.regCode.trim() || undefined,
        parentId: form.parentId ? Number(form.parentId) : null,
        busId: form.busId ? Number(form.busId) : null,
        pickupLat: form.pickupLat === "" ? null : Number(form.pickupLat),
        pickupLng: form.pickupLng === "" ? null : Number(form.pickupLng),
      };

      if (editingStudent) {
        await updateAdminStudent(editingStudent.id, payload);
        toast.success(t("studentUpdated"));
      } else {
        await createAdminStudent(payload);
        toast.success(t("studentAdded"));
      }

      await onRefresh();
      setForm(emptyStudentForm);
      setEditingStudent(null);
      setShowForm(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const filteredIds = filteredStudents.map((s) => s.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...filteredIds])));
    } else {
      const filteredIds = filteredStudents.map((s) => s.id);
      setSelectedIds(selectedIds.filter((id) => !filteredIds.includes(id)));
    }
  };

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.includes(s.id));

  const executeDelete = async () => {
    setIsSaving(true);
    try {
      if (deleteModal.type === "bulk") {
        await bulkDeleteAdminStudents(deleteModal.ids);
        toast.success("Students deleted successfully");
        setSelectedIds([]);
      } else {
        await deleteAdminStudent(deleteModal.ids[0]);
        toast.success("Student deleted successfully");
      }
      await onRefresh();
      setDeleteModal({ isOpen: false, type: "", ids: [] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="space-y-6">
      <ImportStudentsTab onRefresh={onRefresh} />

      <PanelCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("manual")} title={t("studentManagement")} description={t("studentManagementDesc")} />
          <div className="flex flex-wrap gap-3">
            <input className="app-input h-10 w-full sm:w-[260px]" placeholder={t("searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <ActionButton onClick={() => { setEditingStudent(null); setForm(emptyStudentForm); setShowForm(true); }}>
              <HiUserPlus />
              {t("addStudent")}
            </ActionButton>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-line bg-white p-4">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-main">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="h-4 w-4 accent-slate-950 rounded cursor-pointer"
            />
            {t("selectAll") || "Select All"} ({filteredStudents.length})
          </label>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-main">
                {selectedIds.length} {t("selected")}
              </span>
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: true, type: "bulk", ids: selectedIds })}
                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-100"
              >
                <HiTrash className="text-lg" />
                Delete Selected
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div key={student.id} className="rounded-[22px] bg-card-soft p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={() =>
                      setSelectedIds((current) =>
                        current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id]
                      )
                    }
                    className="mt-1.5 h-4 w-4 accent-slate-950 rounded cursor-pointer"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-main">{student.name}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">{student.busId ? t("withBus") : t("withoutBus")}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {student.grade || t("undefined")} - {student.address || t("addressNotDefined")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                      <span>{t("parent")}: {student.parentName || t("notAssigned")}</span>
                      <span>{t("codeLabel")}: {student.regCode || "--"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(student);
                      setForm({
                        name: student.name || "",
                        grade: student.grade || "",
                        address: student.address || "",
                        regCode: student.regCode || "",
                        pickupLat: student.homeLocation?.lat ?? "",
                        pickupLng: student.homeLocation?.lng ?? "",
                        parentId: student.parentId || "",
                        busId: student.busId || "",
                      });
                      setShowForm(true);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-main transition hover:border-accent hover:bg-accent-soft"
                  >
                    <HiPencilSquare className="text-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ isOpen: true, type: "single", ids: [student.id] })}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-red-500 transition hover:border-red-500 hover:bg-red-50"
                    title={t("delete") || "Delete"}
                  >
                    <HiTrash className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <ModalShell
          title="Confirm Deletion"
          description={`Are you sure you want to delete ${deleteModal.type === "bulk" ? deleteModal.ids.length + " selected students" : "this student"}? This action cannot be undone.`}
          onClose={() => setDeleteModal({ isOpen: false, type: "", ids: [] })}
        >
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeleteModal({ isOpen: false, type: "", ids: [] })}
              className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-main transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <ActionButton onClick={executeDelete} disabled={isSaving}>
              {isSaving ? "Deleting..." : "Yes, delete"}
            </ActionButton>
          </div>
        </ModalShell>
      )}

      {showForm ? (
        <ModalShell
          title={editingStudent ? `${t("edit")} ${editingStudent.name}` : t("addStudent")}
          description={t("studentPickupAssignmentDesc")}
          onClose={() => {
            setShowForm(false);
            setEditingStudent(null);
          }}
        >
          <StudentForm form={form} setForm={setForm} onSubmit={handleSubmit} isSaving={isSaving} parents={parents} buses={buses} />
        </ModalShell>
      ) : null}
    </div>
  );
}

export default ImportPage;
