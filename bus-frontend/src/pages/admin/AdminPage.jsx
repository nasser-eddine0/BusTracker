import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { HiDatabase, HiHome, HiTruck, HiUserGroup } from "react-icons/hi";
import { HiClipboardDocumentList, HiUsers } from "react-icons/hi2";
import { fetchAdminBootstrap } from "../../api/admin";
import AppShell from "../../components/ui/AppShell";
import useFirebaseActiveTrips from "../../hooks/useFirebaseActiveTrips";
import useFirebaseBusLocations from "../../hooks/useFirebaseBusLocations";
import useNotificationSocket from "../../hooks/useNotificationSocket";
import { useLanguage } from "../../i18n";
import { buildAdminNavigation } from "./utils";
import AssignmentsPage from "./pages/AssignmentsPage";
import DashboardPage from "./pages/DashboardPage";
import FleetPage from "./pages/FleetPage";
import ImportPage from "./pages/ImportPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";

const MotionDiv = motion.div;

function AdminPage() {
  const location = useLocation();
  const activeTrips = useFirebaseActiveTrips();
  const busLocations = useFirebaseBusLocations();
  const { t } = useLanguage();
  const adminNavigation = useMemo(
    () =>
      buildAdminNavigation(t, {
        HiHome,
        HiUsers,
        HiDatabase,
        HiTruck,
        HiUserGroup,
        HiClipboardDocumentList,
      }),
    [t]
  );
  const [bootstrap, setBootstrap] = useState({
    users: {},
    drivers: {},
    parents: {},
    students: {},
    buses: {},
    summary: {},
    notifications: [],
  });
  const [adminNotifications, setAdminNotifications] = useState([]);

  const refreshAdminData = useCallback(async () => {
    try {
      const data = await fetchAdminBootstrap();
      setBootstrap(data);
      setAdminNotifications(data.notifications || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  useNotificationSocket({
    enabled: true,
    onNotification: useCallback((notification) => {
      setAdminNotifications((current) => [notification, ...current].slice(0, 20));
      if (notification.message) toast(notification.message);
    }, []),
  });

  const users = useMemo(() => Object.entries(bootstrap.users || {}).map(([id, user]) => ({ id, ...user })), [bootstrap.users]);
  const admins = useMemo(() => users.filter((user) => user.role === "admin"), [users]);
  const drivers = useMemo(() => Object.entries(bootstrap.drivers || {}).map(([id, driver]) => ({ id, ...driver })), [bootstrap.drivers]);
  const parents = useMemo(() => Object.entries(bootstrap.parents || {}).map(([id, parent]) => ({ id, ...parent })), [bootstrap.parents]);
  const liveAttendanceByStudent = useMemo(
    () =>
      Object.values(activeTrips).reduce((accumulator, trip) => {
        Object.entries(trip?.live_attendance || {}).forEach(([studentId, attendance]) => {
          accumulator[String(studentId)] = attendance;
        });

        return accumulator;
      }, {}),
    [activeTrips]
  );
  const students = useMemo(
    () =>
      Object.entries(bootstrap.students || {}).map(([id, student]) => ({
        id,
        ...student,
        status: liveAttendanceByStudent[String(id)]?.status || student.status,
      })),
    [bootstrap.students, liveAttendanceByStudent]
  );
  const buses = useMemo(
    () =>
      Object.entries(bootstrap.buses || {}).map(([id, bus]) => ({
        id,
        ...bus,
        location: busLocations[String(id)] || bus.location || null,
      })),
    [bootstrap.buses, busLocations]
  );

  const routeTitle = useMemo(() => {
    const item = adminNavigation.flatMap((group) => group.items).find((entry) => location.pathname.startsWith(entry.to));
    return item?.label || t("dashboard");
  }, [location.pathname, adminNavigation, t]);

  return (
    <AppShell sidebarGroups={adminNavigation} title={routeTitle} topbarProps={{ notifications: adminNotifications }}>
      <AnimatePresence mode="wait">
        <MotionDiv
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage buses={buses} students={students} drivers={drivers} parents={parents} admins={admins} summary={bootstrap.summary || {}} />} />
            <Route path="users" element={<UsersPage admins={admins} drivers={drivers} parents={parents} buses={buses} onRefresh={refreshAdminData} />} />
            <Route path="import" element={<ImportPage students={students} parents={parents} buses={buses} onRefresh={refreshAdminData} />} />
            <Route path="fleet" element={<FleetPage buses={buses} drivers={drivers} students={students} onRefresh={refreshAdminData} />} />
            <Route path="assignments" element={<AssignmentsPage buses={buses} students={students} onRefresh={refreshAdminData} />} />
            <Route path="reports" element={<ReportsPage buses={buses} students={students} />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </MotionDiv>
      </AnimatePresence>
    </AppShell>
  );
}

export default AdminPage;
