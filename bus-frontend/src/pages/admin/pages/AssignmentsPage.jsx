import { useState } from "react";
import toast from "react-hot-toast";
import { updateAssignments } from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { useLanguage } from "../../../i18n";
import { matchesSmartSearch } from "../utils";

function AssignmentsPage({ buses, students, onRefresh }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");

  const filteredStudents = students.filter((student) =>
    matchesSmartSearch(search, [student.name, student.grade, student.parentName, student.busId])
  );

  const handleSingleAssign = async (studentId, busId) => {
    try {
      await updateAssignments([studentId], busId);
      await onRefresh();
      toast.success(t("assignmentUpdated"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedIds.length) {
      toast.error(t("selectAtLeast"));
      return;
    }

    setSaving(true);
    try {
      await updateAssignments(selectedIds, selectedBusId || null);
      await onRefresh();
      setSelectedIds([]);
      toast.success(t("assignmentsSaved"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PanelCard className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t("list")} title={t("studentsAndBuses")} description={t("assignmentDesc")} />
          <input className="app-input h-10 w-full lg:max-w-sm" placeholder={t("searchPlaceholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-line bg-white p-4">
          <span className="text-sm font-bold text-main">{selectedIds.length} {t("selected")}</span>
          <select className="app-input h-10 w-full sm:w-[260px]" value={selectedBusId} onChange={(event) => setSelectedBusId(event.target.value)}>
            <option value="">{t("withoutBus")}</option>
            {buses.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.name} - {bus.routeName}
              </option>
            ))}
          </select>
          <ActionButton onClick={handleBulkAssign} disabled={saving}>
            {t("assignSelection")}
          </ActionButton>
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div key={student.id} className="flex flex-col gap-4 rounded-[24px] border border-line bg-card-soft p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => setSelectedIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])}
                  className="mt-1 h-4 w-4 accent-slate-950"
                />
                <div>
                  <h4 className="text-lg font-bold text-main">{student.name}</h4>
                  <p className="mt-1 text-sm text-muted">
                    {student.grade} - {student.parentName || t("parentNotAssigned")} - {student.address}
                  </p>
                </div>
              </div>
              <select
                className="app-input h-10 w-full lg:w-[280px]"
                value={student.busId || ""}
                onChange={(event) => handleSingleAssign(student.id, event.target.value || null)}
              >
                <option value="">{t("withoutBus")}</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.name} - {bus.routeName}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

export default AssignmentsPage;
