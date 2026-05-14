import { HiBellAlert, HiClipboardDocumentList, HiUserGroup, HiUsers } from "react-icons/hi2";
import { HiTruck } from "react-icons/hi";
import ChartCard from "../../../components/ui/ChartCard";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import StatCard from "../../../components/ui/StatCard";
import { useLanguage } from "../../../i18n";
import AdminGlobalMap from "../components/AdminGlobalMap";

function DashboardPage({ buses, students, drivers, parents, admins, summary }) {
  const { t } = useLanguage();
  const totalStudents = students.length;
  const activeBuses = buses.filter((bus) => bus.location).length;
  const onboardStudents = students.filter((student) => ["mounted", "entered"].includes(student.status)).length;
  const absentStudents = students.filter((student) => student.status === "absent").length;
  const droppedStudents = students.filter((student) => student.status === "dropped").length;
  const activeFleetBuses = buses.filter((bus) => bus.location);
  const todayTrips = Number(summary?.todayTrips || 0);

  const gradeMap = {};
  students.forEach((student) => {
    const grade = student.grade || t("undefined");
    gradeMap[grade] = (gradeMap[grade] || 0) + 1;
  });

  const gradeLabels = Object.keys(gradeMap);
  const gradeValues = Object.values(gradeMap);
  const totalAdmins = admins?.length || 0;
  const totalDrivers = drivers.length;
  const totalParents = parents?.length || 0;
  const busOccupancy = buses.map((bus) => students.filter((student) => student.busId === bus.id).length);
  const busCapacities = buses.map((bus) => Number(bus.capacity || 24));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={HiUsers} title={t("totalStudents")} value={totalStudents} />
        <StatCard icon={HiTruck} title="Fleet Online" value={activeBuses} helper={`${activeBuses} live buses from Firebase`} />
        <StatCard icon={HiClipboardDocumentList} title="Today's Trips" value={todayTrips} helper="Pulled from Laravel history" />
        <StatCard icon={HiBellAlert} title={t("absent")} value={absentStudents} positive={false} />
        <StatCard icon={HiUserGroup} title={t("dropped")} value={droppedStudents} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold tracking-tight text-main">{t("liveMonitoring")}</h3>
              <p className="text-sm leading-6 text-muted">{t("mapDesc")}</p>
            </div>
            <div className="app-pill">{activeFleetBuses.length ? t("liveLabel") : t("preview")}</div>
          </div>

          <AdminGlobalMap buses={activeFleetBuses} t={t} height={360} />
        </PanelCard>

        <PanelCard className="space-y-5">
          <SectionHeader eyebrow={t("activeBusLabel")} title={t("fleetTracking")} description={t("fleetTrackingDesc")} />
          <div className="space-y-3">
            {activeFleetBuses.map((bus) => (
              <div key={bus.id} className="rounded-[22px] bg-card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-main">{bus.name}</p>
                    <p className="mt-1 text-sm text-muted">{bus.routeName}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">
                    {bus.location ? t("online") : t("offline")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {t("driverLabel")}: {bus.driverName || t("notAssigned")} - {students.filter((student) => student.busId === bus.id).length}/{bus.capacity} {t("seats")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Speed: {bus.location?.speed != null ? `${Math.round(bus.location.speed)} km/h` : "N/A"}
                </p>
              </div>
            ))}
            {activeFleetBuses.length === 0 ? (
              <div className="rounded-[22px] bg-card-soft p-4 text-sm text-muted">
                {t("preview")}
              </div>
            ) : null}
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard
          title={t("tripStatus")}
          subtitle={t("tripStatusDesc")}
          tone="line"
          categories={[t("pickup"), t("inTransit"), t("arrived"), t("absent")]}
          seriesLabels={[t("studentsLabel"), t("fleet")]}
          series={[
            { data: [totalStudents, onboardStudents, droppedStudents, absentStudents] },
            { data: [drivers.length, activeBuses, Math.max(activeBuses - absentStudents, 0), buses.length] },
          ]}
          metrics={[
            { label: t("liveBuses"), value: activeBuses },
            { label: t("studentsOnBoard"), value: onboardStudents },
            { label: t("absent"), value: absentStudents, color: "text-rose-500" },
            { label: t("droppedLabel"), value: droppedStudents },
          ]}
        />

        <ChartCard
          title={t("fleetCapacity")}
          subtitle={t("fleetCapacityDesc")}
          tone="bar"
          categories={buses.map((bus) => bus.name?.replace(/^School\s+/i, "").slice(0, 10) || `${t("bus")} ${bus.id}`)}
          seriesLabels={[t("occupied"), t("capacity")]}
          series={[
            { data: busOccupancy },
            { data: busCapacities },
          ]}
          metrics={[
            { label: t("managedBuses"), value: buses.length },
            { label: t("activeDrivers"), value: drivers.filter((driver) => driver.status === "active").length },
            { label: t("totalSeats"), value: buses.reduce((sum, bus) => sum + Number(bus.capacity || 0), 0) },
            { label: t("assignedStudents"), value: students.filter((student) => student.busId).length },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartCard
          title={t("userDistribution")}
          subtitle={t("userDistributionDesc")}
          tone="doughnut"
          categories={[t("admins"), t("drivers"), t("parents"), t("studentsLabel")]}
          series={[{ data: [totalAdmins, totalDrivers, totalParents, totalStudents] }]}
          metrics={[
            { label: t("totalUsers"), value: totalAdmins + totalDrivers + totalParents + totalStudents },
            { label: t("admins"), value: totalAdmins },
            { label: t("drivers"), value: totalDrivers },
            { label: t("parents"), value: totalParents },
          ]}
        />

        <ChartCard
          title={t("studentsByGrade")}
          subtitle={t("studentsByGradeDesc")}
          tone="bar"
          categories={gradeLabels}
          seriesLabels={[t("studentsLabel")]}
          series={[{ data: gradeValues }]}
          metrics={[
            { label: t("distinctGrades"), value: gradeLabels.length },
            { label: t("totalStudents"), value: totalStudents },
            { label: t("avgPerGrade"), value: gradeLabels.length ? Math.round(totalStudents / gradeLabels.length) : 0 },
          ]}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
