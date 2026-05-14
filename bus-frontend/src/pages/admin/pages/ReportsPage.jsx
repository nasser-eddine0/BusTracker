import { HiBellAlert, HiClipboardDocumentList, HiDocumentChartBar, HiUserGroup } from "react-icons/hi2";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import StatCard from "../../../components/ui/StatCard";
import { useLanguage } from "../../../i18n";

function ReportsPage({ buses, students }) {
  const { t } = useLanguage();
  const absentStudents = students.filter((student) => student.status === "absent");
  const onboardStudents = students.filter((student) => ["mounted", "entered"].includes(student.status));
  const droppedStudents = students.filter((student) => student.status === "dropped");

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("reports")} title={t("reportsTitle")} description={t("reportsDesc")} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HiClipboardDocumentList} title={t("trackedStudents")} value={students.length} />
        <StatCard icon={HiUserGroup} title={t("onBoard")} value={onboardStudents.length} />
        <StatCard icon={HiBellAlert} title={t("absent")} value={absentStudents.length} positive={false} />
        <StatCard icon={HiDocumentChartBar} title={t("dropped")} value={droppedStudents.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelCard className="space-y-5">
          <SectionHeader eyebrow={t("absences")} title={t("absentStudents")} description={t("absentListDesc")} />
          <div className="space-y-3">
            {absentStudents.length ? absentStudents.map((student) => (
              <div key={student.id} className="rounded-[22px] bg-card-soft p-4">
                <h3 className="text-base font-bold text-main">{student.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {student.grade || t("undefined")} - {student.parentName || t("parentNotAssigned")}
                </p>
              </div>
            )) : <div className="rounded-[22px] bg-card-soft p-4 text-sm font-semibold text-muted">{t("noAbsences")}</div>}
          </div>
        </PanelCard>
        <PanelCard className="space-y-5">
          <SectionHeader eyebrow={t("trips")} title={t("tripSummaries")} description={t("tripSummariesDesc")} />
          <div className="space-y-3">
            {buses.map((bus) => (
              <div key={bus.id} className="rounded-[22px] bg-card-soft p-4">
                <h3 className="text-base font-bold text-main">{bus.name}</h3>
                <p className="mt-1 text-sm text-muted">{bus.routeName}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                  <span>{t("driverLabel")}: {bus.driverName || t("notAssigned")}</span>
                  <span>{t("tripStatusLabel")}: {bus.tripStatus || t("idle")}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

export default ReportsPage;
