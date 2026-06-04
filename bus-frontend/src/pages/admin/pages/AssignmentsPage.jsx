import { useState } from "react";
import toast from "react-hot-toast";
import { updateAssignments } from "../../../api/admin";
import ActionButton from "../../../components/ui/ActionButton";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { HiMagnifyingGlass, HiMapPin } from "react-icons/hi2";
import { useLanguage } from "../../../i18n";
import { matchesSmartSearch } from "../utils";

function AssignmentsPage({ buses, students, onRefresh }) {
  const { t } = useLanguage();
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");

  const filteredStudents = students.filter((student) => {
    const matchName = matchesSmartSearch(searchName, [student.name, student.grade, student.parentName]);
    const matchAddress = matchesSmartSearch(searchAddress, [student.address]);
    return matchName && matchAddress;
  });

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader eyebrow={t("list")} title={t("studentsAndBuses")} description={t("assignmentDesc")} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg pointer-events-none" />
            <input
              className="app-input h-11 w-full pl-11"
              placeholder={t("searchPlaceholder")}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <HiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg pointer-events-none" />
            <input
              className="app-input h-11 w-full pl-11"
              placeholder={t("searchByAddress")}
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 rounded-[24px] border border-line bg-white p-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-main sm:pr-4 sm:border-r border-line">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="h-4 w-4 accent-slate-950 rounded cursor-pointer"
            />
            {t("selectAll") || "Select All"} ({filteredStudents.length})
          </label>
          
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <span className="text-sm font-bold text-main whitespace-nowrap">
              {selectedIds.length} {t("selected")}
            </span>
            <select className="app-input h-10 w-full sm:w-[240px]" value={selectedBusId} onChange={(event) => setSelectedBusId(event.target.value)}>
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
