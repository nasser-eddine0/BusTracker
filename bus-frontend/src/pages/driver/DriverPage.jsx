import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import toast from "react-hot-toast";
import Sidebar from "../../components/ui/Sidebar";
import { finalizeDriverTrip, fetchDriverDashboard, fetchDriverNotifications, startDriverTrip, updateDriverStudentStatus, pingDriverLocation, nudgeParent, markDriverNotificationsRead } from "../../api/driver";
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
import { normalizeStudentStatus } from "./utils";

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
      setDriverEvents((current) => [
        { id: notification.id, title: notification.title, helper: notification.message, read: false, createdAt: notification.createdAt || new Date().toISOString() },
        ...current,
      ].slice(0, 20));
      if (notification.message) toast(notification.message);
    }, []),
  });

  const unreadDriverCount = useMemo(
    () => driverEvents.filter((e) => e.read === false).length,
    [driverEvents]
  );

  const handleMarkDriverRead = useCallback(async () => {
    try {
      await markDriverNotificationsRead();
      setDriverEvents((current) => current.map((e) => ({ ...e, read: true })));
    } catch { /* ignore */ }
  }, []);

  // Poll for new notifications every 15s during a trip (no WS server running)
  useEffect(() => {
    if (!tripStarted) return undefined;
    const pollNotifs = async () => {
      try {
        const freshNotifs = await fetchDriverNotifications();
        setDriverEvents((current) => {
          const currentIds = new Set(current.map((e) => e.id));
          const newOnes = freshNotifs.filter((n) => !currentIds.has(n.id));
          if (newOnes.length > 0) {
            // Schedule toasts OUTSIDE this updater to avoid StrictMode double-fire
            setTimeout(() => {
              newOnes.forEach((n) => {
                if (n.read === false) toast(n.helper || n.title, { id: `notif-${n.id}` });
              });
            }, 0);
            return [...newOnes, ...current].slice(0, 30);
          }
          return current;
        });
      } catch { /* ignore */ }
    };
    const intervalId = window.setInterval(pollNotifs, 15000);
    return () => window.clearInterval(intervalId);
  }, [tripStarted]);

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

  const waitingStudents = useMemo(() => routeStudents.filter((s) => s.status === "waiting" || s.status === "ready"), [routeStudents]);
  const mountedCount = useMemo(() => routeStudents.filter((student) => ["mounted", "in_bus"].includes(student.status)).length, [routeStudents]);
  const absentCount = useMemo(() => routeStudents.filter((student) => student.status === "absent").length, [routeStudents]);
  const waitingCount = waitingStudents.length;

  // ID-based target selection: driver clicks any waiting student
  const [currentTargetId, setCurrentTargetId] = useState(null);

  // Auto-select first waiting student if no target is set or current target is no longer waiting
  useEffect(() => {
    if (!tripStarted) return;
    const currentStudentStillWaiting = waitingStudents.some((s) => s.id === currentTargetId);
    if (!currentStudentStillWaiting && waitingStudents.length > 0) {
      setCurrentTargetId(waitingStudents[0].id);
    }
  }, [waitingStudents, currentTargetId, tripStarted]);

  const currentStudent = routeStudents.find((s) => s.id === currentTargetId && (s.status === "waiting" || s.status === "ready")) || waitingStudents[0] || null;

  const handleSelectStudent = useCallback((studentId) => {
    setCurrentTargetId(studentId);
  }, []);

  const [distanceToTarget, setDistanceToTarget] = useState(null);

  useEffect(() => {
    if (!tripStarted || !currentStudent) return;
    setStatusStage("heading");
  }, [currentStudent?.id, tripStarted]);

  // Update statusStage based on real distance from backend ping
  useEffect(() => {
    if (distanceToTarget === null) {
      setStatusStage("heading");
    } else if (distanceToTarget <= 50) {
      setStatusStage("door");
    } else if (distanceToTarget <= 2000) {
      setStatusStage("near");
    } else {
      setStatusStage("heading");
    }
  }, [distanceToTarget]);

  const statusText = statusStage === "door" ? t("atDoor") : statusStage === "near" ? t("arrivingPickup") : t("headingNext");

  // GPS ping every 5 seconds: sends location to backend for geofencing + updates Firebase
  useEffect(() => {
    if (!tripStarted || !activeTripId) return undefined;
    if (!("geolocation" in navigator)) return undefined;

    const writeLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          // 1. Ping the backend (geofencing + bus coordinates update)
          try {
            const pingResult = await pingDriverLocation(
              activeTripId,
              coords.latitude,
              coords.longitude,
              currentStudent?.id || null
            );
            if (pingResult.distance !== null && pingResult.distance !== undefined) {
              setDistanceToTarget(pingResult.distance);
            }
          } catch {
            // Backend ping failed; continue with Firebase fallback
          }

          // 2. Also update Firebase for real-time parent map tracking
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
            // Ignore transient realtime write failures
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
  }, [activeTripId, tripStarted, currentStudent?.id]);

  const handleNudgeParent = async () => {
    if (!currentStudent?.id || !activeTripId) return;
    try {
      await nudgeParent(activeTripId, currentStudent.id);
      toast.success(t("nudgeSent") || "المرجو الإسراع — تم الإرسال");
    } catch {
      toast.error(t("saveError"));
    }
  };

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

      try {
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
      } catch {
        // Firebase write may fail due to permissions; trip still works via backend
      }

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

      // Clear the current target so the effect can auto-select the next waiting student.
      setCurrentTargetId(null);
      setDistanceToTarget(null);

      toast.success(["mounted", "in_bus"].includes(status) ? t("studentMounted") : t("studentAbsent"));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || t("saveError"));
    } finally {
      setTripBusy(false);
    }
  };

  const handleDrop = async () => {
    if (!bus?.id || !activeTripId || tripBusy || tripCompleted) return;

    setTripBusy(true);
    try {
      // Try Firebase first, fall back to local React state if permission denied
      let liveAttendance = {};
      try {
        const attendanceSnapshot = await get(ref(db, `active_trips/${activeTripId}/live_attendance`));
        liveAttendance = attendanceSnapshot.val() || {};
      } catch {
        // Firebase read failed — use local state instead
        liveAttendance = activeTripState?.live_attendance || {};
      }

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

      try { await remove(ref(db, `active_trips/${activeTripId}`)); } catch { /* Firebase cleanup optional */ }
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
        return <NotificationsView t={t} driverEvents={driverEvents} onMarkRead={handleMarkDriverRead} />;
      case "map":
        return <MapView t={t} tripStarted={tripStarted} statusText={statusText} currentStudent={currentStudent} routeStudents={routeStudents} busLive={busLive} />;
      default:
        return (
          <TripView
            t={t}
            busLive={busLive}
            routeStudents={routeStudents}
            waitingStudents={waitingStudents}
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
            handleSelectStudent={handleSelectStudent}
            handleNudgeParent={handleNudgeParent}
            distanceToTarget={distanceToTarget}
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
            notifCount={unreadDriverCount}
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
