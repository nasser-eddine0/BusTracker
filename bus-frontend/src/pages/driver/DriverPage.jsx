import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import toast from "react-hot-toast";
import Sidebar from "../../components/ui/Sidebar";
import { finalizeDriverTrip, fetchDriverDashboard, startDriverTrip, updateDriverStudentStatus } from "../../api/driver";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import useNotificationSocket from "../../hooks/useNotificationSocket";
import useFirebaseBusLocations from "../../hooks/useFirebaseBusLocations";
import { useLanguage } from "../../i18n";
import { buildDriverNavigation } from "./constants";
import DriverHeader from "./components/DriverHeader";
import MapView from "./views/MapView";
import NotificationsView from "./views/NotificationsView";
import ProfileView from "./views/ProfileView";
import TripView from "./views/TripView";
import { buildStudentRoute, normalizeStudentStatus } from "./utils";

const MotionDiv = motion.div;

function DriverPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const driverNavigation = useMemo(() => buildDriverNavigation(t), [t]);
  const liveLocations = useFirebaseBusLocations();
  const [bus, setBus] = useState(null);
  const [studentsMap, setStudentsMap] = useState({});
  const [driverEvents, setDriverEvents] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeTripState, setActiveTripState] = useState(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [tripBusy, setTripBusy] = useState(false);
  const [statusStage, setStatusStage] = useState("heading");

  const refreshDriverDashboard = useCallback(async () => {
    try {
      const data = await fetchDriverDashboard();
      const isInProgress = data.bus?.tripStatus === "in_progress" && Boolean(data.bus?.activeTripId);
      setBus(data.bus || null);
      setStudentsMap(data.students || {});
      setDriverEvents(data.notifications || []);
      setActiveTripId(data.bus?.activeTripId || null);
      setTripStarted(isInProgress);
      setTripCompleted(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    refreshDriverDashboard();
  }, [refreshDriverDashboard]);

  useEffect(() => {
    if (location.pathname === "/driver" || location.pathname === "/driver/") {
      navigate("/driver/trip", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!activeTripId) {
      setActiveTripState(null);
      return undefined;
    }

    const unsubscribe = onValue(ref(db, `active_trips/${activeTripId}`), (snapshot) => {
      setActiveTripState(snapshot.val() || null);
    });

    return () => unsubscribe();
  }, [activeTripId]);

  useNotificationSocket({
    enabled: Boolean(user),
    onNotification: useCallback((notification) => {
      setDriverEvents((current) => [{ id: notification.id, title: notification.title, helper: notification.message }, ...current].slice(0, 20));
    }, []),
  });

  const busLive = useMemo(
    () => (bus ? { ...bus, location: liveLocations[String(bus.id)] || bus.location || null } : null),
    [bus, liveLocations]
  );

  const routeStudents = useMemo(
    () =>
      Object.entries(studentsMap).map(([id, student]) => ({
        id,
        name: student.name || id,
        address: student.address || t("addressNotDefined"),
        status: normalizeStudentStatus(activeTripState?.live_attendance?.[String(id)]?.status || student.status),
        homeLocation: student.homeLocation || null,
      })),
    [activeTripState?.live_attendance, studentsMap, t]
  );

  const currentStudent = useMemo(() => routeStudents.find((student) => student.status === "waiting") || null, [routeStudents]);
  const mountedCount = useMemo(() => routeStudents.filter((student) => student.status === "mounted").length, [routeStudents]);
  const absentCount = useMemo(() => routeStudents.filter((student) => student.status === "absent").length, [routeStudents]);
  const waitingCount = useMemo(() => routeStudents.filter((student) => student.status === "waiting").length, [routeStudents]);

  useEffect(() => {
    if (!tripStarted || !currentStudent) return;
    setStatusStage("heading");
    const timer1 = setTimeout(() => setStatusStage("near"), 1600);
    const timer2 = setTimeout(() => setStatusStage("door"), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentStudent, tripStarted]);

  const routeLine = useMemo(
    () => buildStudentRoute(busLive?.location, currentStudent?.homeLocation),
    [busLive?.location, currentStudent?.homeLocation]
  );
  const statusText = statusStage === "door" ? t("atDoor") : statusStage === "near" ? t("arrivingPickup") : t("headingNext");

  useEffect(() => {
    if (!tripStarted || !activeTripId) return undefined;
    if (!("geolocation" in navigator)) return undefined;

    const writeLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            await update(ref(db, `active_trips/${activeTripId}`), {
              live_location: {
                lat: coords.latitude,
                lng: coords.longitude,
                updated_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Ignore transient realtime write failures here; trip finalization remains the durable sync point.
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    };

    writeLocation();
    const intervalId = window.setInterval(writeLocation, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTripId, tripStarted]);

  const activeView = useMemo(() => {
    const pathname = location.pathname.toLowerCase();
    if (pathname.endsWith("/profile")) return "profile";
    if (pathname.endsWith("/map")) return "map";
    if (pathname.endsWith("/notifications")) return "notifications";
    return "trip";
  }, [location.pathname]);

  const handleStartTrip = async () => {
    if (!bus?.id) return;

    setTripBusy(true);
    try {
      const data = await startDriverTrip(bus.id);
      const nextTripId = data.tripId;
      const nextLiveAttendance = Object.fromEntries(
        Object.entries(studentsMap).map(([studentId, student]) => [
          String(studentId),
          {
            status: normalizeStudentStatus(student.status),
            updated_at: new Date().toISOString(),
          },
        ])
      );

      await set(ref(db, `active_trips/${nextTripId}`), {
        trip_id: Number(nextTripId),
        bus_id: Number(bus.id),
        driver_id: user?.id ? Number(user.id) : null,
        status: "in_progress",
        started_at: data.trip?.startedAt || new Date().toISOString(),
        live_location: busLive?.location
          ? {
              lat: busLive.location.lat,
              lng: busLive.location.lng,
              updated_at: new Date().toISOString(),
            }
          : null,
        live_attendance: nextLiveAttendance,
      });

      setActiveTripId(nextTripId);
      setActiveTripState({
        trip_id: Number(nextTripId),
        bus_id: Number(bus.id),
        driver_id: user?.id ? Number(user.id) : null,
        status: "in_progress",
        started_at: data.trip?.startedAt || new Date().toISOString(),
        live_location: busLive?.location || null,
        live_attendance: nextLiveAttendance,
      });
      setTripStarted(true);
      setTripCompleted(false);
      toast.success(t("tripStarted"));
      await refreshDriverDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setTripBusy(false);
    }
  };

  const handleStudentAction = async (status) => {
    if (!currentStudent || !bus?.id || tripBusy) return;

    setTripBusy(true);
    try {
      const updatedAttendance = {
        status,
        updated_at: new Date().toISOString(),
      };

      await updateDriverStudentStatus(currentStudent.id, {
        busId: bus.id,
        status,
      });

      setActiveTripState((current) => ({
        ...(current || {}),
        live_attendance: {
          ...(current?.live_attendance || {}),
          [String(currentStudent.id)]: updatedAttendance,
        },
      }));

      if (activeTripId) {
        try {
          await update(ref(db, `active_trips/${activeTripId}/live_attendance/${currentStudent.id}`), updatedAttendance);
        } catch {
          // Keep the backend as the source of truth when realtime writes are blocked.
        }
      }

      setStudentsMap((current) => ({
        ...current,
        [String(currentStudent.id)]: {
          ...current[String(currentStudent.id)],
          status,
        },
      }));

      toast.success(status === "mounted" ? t("studentMounted") : t("studentAbsent"));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || t("saveError"));
      await refreshDriverDashboard();
    } finally {
      setTripBusy(false);
    }
  };

  const handleDrop = async () => {
    if (!bus?.id || !activeTripId || tripBusy || tripCompleted) return;

    setTripBusy(true);
    try {
      const attendanceSnapshot = await get(ref(db, `active_trips/${activeTripId}/live_attendance`));
      const liveAttendance = attendanceSnapshot.val() || {};
      const attendance = Object.entries(studentsMap).map(([studentId, student]) => {
        const liveEntry = liveAttendance[String(studentId)] || {};

        return {
          student_id: Number(studentId),
          status: normalizeStudentStatus(liveEntry.status || student.status),
          recorded_at: liveEntry.updated_at || new Date().toISOString(),
        };
      });

      await finalizeDriverTrip(activeTripId, {
        attendance,
        final_location: busLive?.location
          ? {
              lat: busLive.location.lat,
              lng: busLive.location.lng,
            }
          : null,
      });

      await remove(ref(db, `active_trips/${activeTripId}`));
      setActiveTripId(null);
      setActiveTripState(null);
      setTripCompleted(true);
      toast.success(t("dropCompleted"));
      await refreshDriverDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || t("saveError"));
    } finally {
      setTripBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const renderView = () => {
    switch (activeView) {
      case "profile":
        return (
          <ProfileView
            t={t}
            user={user}
            busLive={busLive}
            routeStudents={routeStudents}
            tripStarted={tripStarted}
            tripCompleted={tripCompleted}
            mountedCount={mountedCount}
            absentCount={absentCount}
          />
        );
      case "notifications":
        return <NotificationsView t={t} driverEvents={driverEvents} />;
      case "map":
        return <MapView t={t} tripStarted={tripStarted} statusText={statusText} currentStudent={currentStudent} routeStudents={routeStudents} busLive={busLive} />;
      default:
        return (
          <TripView
            t={t}
            busLive={busLive}
            routeStudents={routeStudents}
            waitingCount={waitingCount}
            mountedCount={mountedCount}
            absentCount={absentCount}
            tripBusy={tripBusy}
            tripStarted={tripStarted}
            tripCompleted={tripCompleted}
            currentStudent={currentStudent}
            handleStartTrip={handleStartTrip}
            handleDrop={handleDrop}
            handleStudentAction={handleStudentAction}
            routeLine={routeLine}
            statusText={statusText}
            statusStage={statusStage}
            bus={bus}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-page text-main">
      <div className="min-h-screen lg:flex">
        <Sidebar items={driverNavigation} subtitle={t("driver")} />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">
          <DriverHeader
            driverName={user?.name || t("driver")}
            busName={busLive?.name || t("noBus")}
            onLogout={handleLogout}
            notifCount={driverEvents.length}
            onNotifClick={() => navigate("/driver/notifications")}
          />
          <div className="mt-6">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeView}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {renderView()}
              </MotionDiv>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DriverPage;
