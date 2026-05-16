import { useMemo, useState } from "react";
import { HiChartBar, HiClock, HiLocationMarker, HiTable } from "react-icons/hi";
import { HiBell } from "react-icons/hi2";
import PanelCard from "../../../components/ui/PanelCard";
import StatCard from "../../../components/ui/StatCard";
import { useLanguage } from "../../../i18n";
import { buildAdminDashboardMockData } from "../mockDashboardData";
import AnalyticsView from "../views/AnalyticsView";
import ArchiveView from "../views/ArchiveView";
import LiveAdminView from "../views/LiveAdminView";

const TABS = [
  { id: "live", label: "Live Tracking", icon: HiLocationMarker },
  { id: "archive", label: "Archives & Reports", icon: HiTable },
  { id: "analytics", label: "Analytics", icon: HiChartBar },
];

function AdminDashboard({ buses, students, parents, notifications, summary, activeTrips, initialTab = "live" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { t } = useLanguage();

  const dashboardData = useMemo(
    () => buildAdminDashboardMockData({ students, buses, parents, notifications, summary, activeTrips }),
    [students, buses, parents, notifications, summary, activeTrips]
  );

  const liveTrips = useMemo(() => Object.entries(activeTrips || {})
    .filter(([, trip]) => ["active", "in_progress"].includes(trip?.status))
    .map(([id, trip]) => {
      const bus = buses.find((entry) => String(entry.id) === String(trip?.bus_id));
      return {
        id,
        busId: String(trip?.bus_id || bus?.id || ""),
        busName: bus?.name || `Bus ${trip?.bus_id || "--"}`,
        routeName: bus?.routeName || "Route active",
        driverName: bus?.driverName || "Chauffeur assigné",
        type: trip?.type || "aller",
        statusLabel: trip?.status === "active" ? "Active" : "In Progress",
        location: trip?.live_location || bus?.location || null,
        studentsTracked: Object.keys(trip?.live_attendance || {}).length,
      };
    }), [activeTrips, buses]);

  const liveBuses = useMemo(
    () => buses.filter((bus) => liveTrips.some((trip) => String(trip.busId) === String(bus.id))),
    [buses, liveTrips]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HiLocationMarker} title={t("activeTripsToday")} value={dashboardData.summaryCards.activeTripsToday} helper={t("firebaseLiveStream")} />
        <StatCard icon={HiBell} title={t("totalAbsencesToday")} value={dashboardData.summaryCards.totalAbsencesToday} positive={false} helper={t("derivedFromPresencesMock")} />
        <StatCard icon={HiClock} title={t("completedTripsLabel")} value={dashboardData.summaryCards.completedTrips} helper={t("archivesLayoutPrototype")} />
        <StatCard icon={HiChartBar} title={t("nudgeSignals")} value={dashboardData.summaryCards.nudgeSignals} helper={t("notificationsAlertLog")} />
      </div>

      <PanelCard>
        <div className="inline-flex flex-wrap gap-2 rounded-[22px] bg-card-soft p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-white text-main shadow-[var(--shadow-soft)]"
                    : "text-muted hover:bg-white/70 hover:text-main"
                }`}
              >
                <Icon className="text-base" />
                {tab.id === "live" ? t("liveTrackingTab") : tab.id === "archive" ? t("archiveReportsTab") : t("analyticsTab")}
              </button>
            );
          })}
        </div>
      </PanelCard>

      {activeTab === "live" ? (
        <LiveAdminView t={t} liveTrips={liveTrips} liveBuses={liveBuses} />
      ) : null}

      {activeTab === "archive" ? (
        <ArchiveView archiveTrips={dashboardData.archiveTrips} notifications={dashboardData.nudgeNotifications} />
      ) : null}

      {activeTab === "analytics" ? (
        <AnalyticsView
          durationSeries={dashboardData.analyticsDurations}
          attendanceRate={dashboardData.attendanceRate}
          alertsLog={dashboardData.alertsLog}
        />
      ) : null}
    </div>
  );
}

export default AdminDashboard;
