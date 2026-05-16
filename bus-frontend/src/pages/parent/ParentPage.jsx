import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ref, update } from "firebase/database";
import { HiBell, HiTruck } from "react-icons/hi";
import { HiMapPin, HiUser } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { declareParentAbsence, declareParentReady, fetchParentDashboard, fetchParentNotifications, markParentNotificationsRead } from "../../api/parent";
import { useAuth } from "../../context/AuthContext";
import { useActiveTripById, useRealtime, useTripForBus } from "../../context/useRealtime";
import { db } from "../../firebase";
import useNotificationSocket from "../../hooks/useNotificationSocket";
import { useLanguage } from "../../i18n";
import AlertsTab from "./views/AlertsTab";
import HomeTab from "./views/HomeTab";
import MapTab from "./views/MapTab";
import ProfileTab from "./views/ProfileTab";
import AbsenceConfirmModal from "./components/AbsenceConfirmModal";
import LocationValidationModal from "./components/LocationValidationModal";
import { getDistanceInKilometers, getStatusConfig } from "./utils";

const MotionDiv = motion.div;

function ParentPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { busLocations } = useRealtime();
  const tabs = useMemo(() => [
    { id: "home", label: t("home"), icon: HiTruck },
    { id: "map", label: t("map"), icon: HiMapPin },
    { id: "alerts", label: t("alertsTab"), icon: HiBell },
    { id: "profile", label: t("profile"), icon: HiUser },
  ], [t]);
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [assignmentMessage, setAssignmentMessage] = useState(null);
  const [proximityAlert, setProximityAlert] = useState("");
  const [readyState, setReadyState] = useState("waiting");
  const [savingAbsence, setSavingAbsence] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);

  const refreshParentDashboard = useCallback(async () => {
    try {
      const data = await fetchParentDashboard();
      setStudent(data.student || null);
      setBus(data.bus || null);
      setNotifications(data.notifications || []);
      setAssignmentMessage(data.student ? "" : t("noStudentLinked"));
    } catch (error) {
      setAssignmentMessage(t("loadError"));
      toast.error(error?.response?.data?.message || t("saveError"));
    }
  }, [t]);

  useEffect(() => {
    refreshParentDashboard();
  }, [refreshParentDashboard]);

  // Check if location validation is required after data loads
  useEffect(() => {
    if (student && student.locationConformee === false) {
      setShowLocationModal(true);
    }
  }, [student]);

  const applyIncomingNotification = useCallback((notification, options = {}) => {
    if (notification?.studentId && String(notification.studentId) === String(student?.id || "")) {
      const nextStatus = notification?.payload?.studentStatus;
      if (notification.type === "trip_finalized" && nextStatus) {
        setStudent((current) => (current ? { ...current, status: nextStatus } : current));
      }
    }

    if (notification?.type === "trip_started" && notification?.payload?.tripType) {
      setBus((current) => (current ? { ...current, latestTripType: notification.payload.tripType } : current));
    }

    if (notification?.type === "trip_finalized" && notification?.payload?.tripType) {
      setBus((current) => (current ? { ...current, latestTripType: notification.payload.tripType } : current));
    }

    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      return [notification, ...current].slice(0, 50);
    });

    if (options.toast !== false && notification.message) {
      toast(notification.message, { id: `parent-notif-${notification.id}` });
    }
  }, [student?.id]);

  useNotificationSocket({
    enabled: Boolean(user),
    onNotification: useCallback((notification) => {
      applyIncomingNotification(notification);
    }, [applyIncomingNotification]),
  });

  useEffect(() => {
    if (!user) return undefined;

    const pollNotifications = async () => {
      try {
        const freshNotifications = await fetchParentNotifications();
        const currentIds = new Set(notifications.map((item) => item.id));
        freshNotifications
          .filter((notification) => !currentIds.has(notification.id))
          .forEach((notification) => applyIncomingNotification(notification));
      } catch {
        // Ignore polling failures; websocket or next poll will recover.
      }
    };

    const intervalId = window.setInterval(pollNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, [applyIncomingNotification, notifications, user]);

  // Detect active trip from Firebase in real-time (no refresh needed)
  const liveTripId = useTripForBus(bus?.id);
  const effectiveTripId = liveTripId || bus?.activeTripId || null;
  const activeTrip = useActiveTripById(effectiveTripId);

  const busWithLiveLocation = useMemo(() => {
    if (!bus) return null;

    // Only show bus location when there is an active trip
    const hasActiveTrip = Boolean(effectiveTripId);
    const liveLocation = activeTrip?.live_location || busLocations[String(bus.id)] || null;

    return {
      ...bus,
      activeTripId: effectiveTripId,
      location: hasActiveTrip ? (liveLocation || bus.location || null) : null,
    };
  }, [activeTrip?.live_location, bus, busLocations, effectiveTripId]);

  const studentWithLiveStatus = useMemo(() => {
    if (!student) return null;
    const liveStatus = activeTrip?.live_attendance?.[String(student.id)]?.status;

    return {
      ...student,
      status: liveStatus || student.status,
    };
  }, [activeTrip?.live_attendance, student]);

  useEffect(() => {
    if (studentWithLiveStatus?.status === "absent") {
      setReadyState("not-coming");
      return;
    }

    if (studentWithLiveStatus?.status === "ready") {
      setReadyState("ready");
      return;
    }

    setReadyState("waiting");
  }, [studentWithLiveStatus?.status]);

  const homeLocation = student?.homeLocation || null;
  const distanceToBus = useMemo(
    () => (!busWithLiveLocation?.location ? null : getDistanceInKilometers(homeLocation, busWithLiveLocation.location)),
    [busWithLiveLocation, homeLocation]
  );
  const unreadCount = notifications.filter((item) => item.read === false).length;
  const statusConfig = useMemo(() => getStatusConfig(studentWithLiveStatus?.status, t, {
    hasActiveTrip: Boolean(effectiveTripId),
    activeTripType: activeTrip?.type || null,
    latestTripType: bus?.latestTripType || null,
  }), [studentWithLiveStatus?.status, t, effectiveTripId, activeTrip?.type, bus?.latestTripType]);

  const notificationFeed = useMemo(() => {
    if (!notifications.length) {
      return [{ id: "empty", title: t("noNotifications"), helper: t("updatesWillAppear"), tone: "info" }];
    }

    return notifications.slice(0, 12).map((item) => ({
      id: item.id,
      title: item.message || item.title || t("tripUpdate"),
      helper: item.studentName || t("parentNotification"),
      tone: item.read ? "info" : "success",
      read: item.read,
      createdAt: item.createdAt,
    }));
  }, [notifications, t]);

  const handleMarkParentRead = useCallback(async () => {
    try {
      await markParentNotificationsRead();
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!bus?.activeTripId) {
      setProximityAlert("");
      return;
    }

    if (!studentWithLiveStatus?.id || !busWithLiveLocation?.location || !homeLocation || distanceToBus === null) {
      setProximityAlert("");
      return;
    }

    const proximityStorageKey = `parent-proximity-${studentWithLiveStatus.id}-trip-${bus.activeTripId}`;
    const proximityState = window.sessionStorage.getItem(proximityStorageKey);

    if (distanceToBus <= 0.5) {
      setProximityAlert("The bus is arriving soon!");
    } else {
      setProximityAlert("");
    }

    if (distanceToBus <= 0.4) {
      if (proximityState !== "very-close") {
        const nextNotification = {
          id: `proximity-very-close-${studentWithLiveStatus.id}-trip-${bus.activeTripId}`,
          title: t("busVeryClose"),
          message: t("busWithin400m"),
          studentName: studentWithLiveStatus.name,
          read: false,
        };

        window.sessionStorage.setItem(proximityStorageKey, "very-close");

        setNotifications((current) => {
          if (current.some((item) => item.id === nextNotification.id)) return current;
          return [nextNotification, ...current].slice(0, 50);
        });

        toast.success(nextNotification.message);
      }

      return;
    }

    if (distanceToBus <= 0.5) {
      if (!proximityState) {
        const nextNotification = {
          id: `proximity-close-${studentWithLiveStatus.id}-trip-${bus.activeTripId}`,
          title: t("busApproaching"),
          message: "The bus is arriving soon!",
          studentName: studentWithLiveStatus.name,
          read: false,
        };

        window.sessionStorage.setItem(proximityStorageKey, "close");

        setNotifications((current) => {
          if (current.some((item) => item.id === nextNotification.id)) return current;
          return [nextNotification, ...current].slice(0, 50);
        });

        toast.success(nextNotification.message);
      }

      return;
    }

    if (proximityState) {
      window.sessionStorage.removeItem(proximityStorageKey);
    }
  }, [bus?.activeTripId, busWithLiveLocation?.location, distanceToBus, homeLocation, studentWithLiveStatus, t]);

  const handleReady = async () => {
    if (!studentWithLiveStatus?.id || readyState === "not-coming") return;
    setReadyState("ready");
    toast.success(t("childReady"));

    // Update Firebase so the driver sees "ready" status in real-time
    if (effectiveTripId) {
      try {
        await update(ref(db, `active_trips/${effectiveTripId}/live_attendance/${studentWithLiveStatus.id}`), {
          status: "ready",
          updated_at: new Date().toISOString(),
        });
      } catch { /* best-effort */ }
    }

    try {
      await declareParentReady(studentWithLiveStatus.id);
    } catch { /* notification is best-effort */ }
  };

  const handleOpenAbsenceModal = useCallback(() => {
    if (!studentWithLiveStatus?.id || savingAbsence || readyState === "not-coming") return;
    setShowAbsenceModal(true);
  }, [readyState, savingAbsence, studentWithLiveStatus?.id]);

  const handleCloseAbsenceModal = useCallback(() => {
    if (savingAbsence) return;
    setShowAbsenceModal(false);
  }, [savingAbsence]);

  const handleNotComing = async () => {
    if (!studentWithLiveStatus?.id) return;

    setSavingAbsence(true);
    try {
      const response = await declareParentAbsence(studentWithLiveStatus.id);
      setStudent(response.data.student);

      // Update Firebase so the driver sees "absent" status in real-time
      if (effectiveTripId) {
        try {
          await update(ref(db, `active_trips/${effectiveTripId}/live_attendance/${studentWithLiveStatus.id}`), {
            status: "absent",
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Absence is already persisted in the backend; ignore realtime mirror failures.
        }
      }

      setReadyState("not-coming");
      setShowAbsenceModal(false);
      toast.success(t("absenceConfirmed"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("absenceError"));
    } finally {
      setSavingAbsence(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const etaMinutes = distanceToBus === null ? null : Math.max(1, Math.round(distanceToBus * 4));

  const renderTabContent = () => {
    switch (activeTab) {
      case "map":
        return (
          <MapTab
            t={t}
            busWithLiveLocation={busWithLiveLocation}
            student={studentWithLiveStatus}
            distanceToBus={distanceToBus}
            etaMinutes={etaMinutes}
            proximityAlert={proximityAlert}
          />
        );
      case "alerts":
        return <AlertsTab t={t} unreadCount={unreadCount} notificationFeed={notificationFeed} onMarkRead={handleMarkParentRead} />;
      case "profile":
        return <ProfileTab t={t} user={user} student={studentWithLiveStatus} busWithLiveLocation={busWithLiveLocation} statusConfig={statusConfig} handleLogout={handleLogout} />;
      default:
        return (
          <HomeTab
            t={t}
            statusConfig={statusConfig}
            distanceToBus={distanceToBus}
            busWithLiveLocation={busWithLiveLocation}
            etaMinutes={etaMinutes}
            student={studentWithLiveStatus}
            assignmentMessage={assignmentMessage}
            proximityAlert={proximityAlert}
            readyState={readyState}
            savingAbsence={savingAbsence}
            notifications={notifications}
            notificationFeed={notificationFeed}
            handleReady={handleReady}
            handleOpenAbsenceModal={handleOpenAbsenceModal}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-page text-main">
      {showLocationModal && student && (
        <LocationValidationModal
          student={student}
          onLocationConfirmed={(updatedStudent) => {
            setStudent(updatedStudent);
            setShowLocationModal(false);
          }}
        />
      )}
      {showAbsenceModal && (
        <AbsenceConfirmModal
          t={t}
          studentName={studentWithLiveStatus?.name || student?.name || ""}
          savingAbsence={savingAbsence}
          onCancel={handleCloseAbsenceModal}
          onConfirm={handleNotComing}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sm font-extrabold text-slate-900">
              <HiTruck className="text-base" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold leading-tight text-main">{t("busTracker")}</h1>
              <p className="text-[11px] text-muted">{t("parentSpace")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:bg-accent-soft"
          >
            <HiBell className="text-lg" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="px-4 pb-24 pt-4">
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {renderTabContent()}
          </MotionDiv>
        </AnimatePresence>
      </div>

      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white/90 backdrop-blur-xl">
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            const showBadge = tab.id === "alerts" && unreadCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${isActive ? "text-accent" : "text-muted"}`}
              >
                {isActive ? (
                  <motion.div
                    layoutId="parent-tab-indicator"
                    className="absolute -top-px left-1/4 right-1/4 h-[3px] rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ) : null}
                <div className="relative">
                  <TabIcon className={`text-xl ${isActive ? "text-accent" : ""}`} />
                  {showBadge ? (
                    <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                      {Math.min(unreadCount, 9)}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? "text-accent" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default ParentPage;
