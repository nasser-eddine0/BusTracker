import { useState } from "react";
import toast from "react-hot-toast";
import { HiCloudUpload } from "react-icons/hi";
import { HiPencilSquare, HiUserPlus } from "react-icons/hi2";
import {
  createAdminStudent,
  importPreviewStudents,
  updateAdminStudent,
} from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { importPreviewRows } from "../../../data/mockUi";
import { useLanguage } from "../../../i18n";
import { emptyStudentForm } from "../constants";
import { matchesSmartSearch } from "../utils";
import ModalShell from "../components/ModalShell";
import StudentForm from "../components/StudentForm";

function ImportPage({ students, parents, buses, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyStudentForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const filteredStudents = students.filter((student) =>
    matchesSmartSearch(search, [student.name, student.grade, student.address, student.parentName])
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        grade: form.grade.trim(),
        address: form.address.trim(),
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

  const handleImportPreview = async () => {
    try {
      await importPreviewStudents(importPreviewRows.map((row) => ({ ...row, regCode: row.regCode })));
      await onRefresh();
      toast.success(t("importSaved"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  return (
    <div className="space-y-6">
      <PanelCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("manual")} title={t("studentManagement")} description={t("studentManagementDesc")} />
          <div className="flex flex-wrap gap-3">
            <input className="app-input h-10 w-full sm:w-[260px]" placeholder={t("searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <ActionButton variant="secondary" onClick={handleImportPreview}>
              <HiCloudUpload />
              {t("importPreview")}
            </ActionButton>
            <ActionButton onClick={() => { setEditingStudent(null); setForm(emptyStudentForm); setShowForm(true); }}>
              <HiUserPlus />
              {t("addStudent")}
            </ActionButton>
          </div>
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div key={student.id} className="rounded-[22px] bg-card-soft p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-main">{student.name}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">{student.busId ? t("withBus") : t("withoutBus")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {student.grade} - {student.address}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                    <span>{t("parent")}: {student.parentName || t("notAssigned")}</span>
                    <span>{t("codeLabel")}: {student.regCode || "--"}</span>
                  </div>
                </div>
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
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

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
