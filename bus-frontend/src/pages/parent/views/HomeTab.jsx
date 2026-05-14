import { HiCheckCircle, HiLocationMarker, HiTruck, HiXCircle } from "react-icons/hi";
import { motion } from "framer-motion";

const MotionDiv = motion.div;

function HomeTab({
  t,
  statusConfig,
  distanceToBus,
  busWithLiveLocation,
  etaMinutes,
  student,
  assignmentMessage,
  proximityAlert,
  readyState,
  savingAbsence,
  notifications,
  notificationFeed,
  handleReady,
  handleNotComing,
  setActiveTab,
}) {
  return (
    <div className="space-y-4">
      <div className={`relative overflow-hidden rounded-[24px] ${statusConfig.color} p-5 shadow-lg`}>
        {statusConfig.pulse ? <div className="absolute right-4 top-4 h-3 w-3 animate-ping rounded-full bg-white/60" /> : null}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <statusConfig.icon className={`text-xl ${statusConfig.textColor}`} />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${statusConfig.textColor} opacity-80`}>{t("liveStatus")}</p>
            <h2 className={`text-xl font-extrabold ${statusConfig.textColor}`}>{statusConfig.text}</h2>
          </div>
        </div>
        {distanceToBus !== null && distanceToBus <= 1.2 ? (
          <div className={`mt-4 rounded-2xl bg-white/20 px-4 py-2.5 text-sm font-bold ${statusConfig.textColor} backdrop-blur-sm`}>
            ⚡ {t("bus")} {distanceToBus <= 0.4 ? t("almostHere") : t("approaching")}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[20px] border border-line bg-white p-3.5 text-center shadow-sm">
          <HiTruck className="mx-auto text-lg text-accent" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("bus")}</p>
          <p className="mt-0.5 truncate text-sm font-extrabold text-main">{busWithLiveLocation?.name || t("noValue")}</p>
        </div>
        <div className="rounded-[20px] border border-line bg-white p-3.5 text-center shadow-sm">
          <HiLocationMarker className="mx-auto text-lg text-sky-500" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("eta")}</p>
          <p className="mt-0.5 text-sm font-extrabold text-main">{etaMinutes !== null ? `${etaMinutes} ${t("minUnit")}` : t("noValue")}</p>
        </div>
        <div className="rounded-[20px] border border-line bg-white p-3.5 text-center shadow-sm">
          <HiLocationMarker className="mx-auto text-lg text-emerald-500" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("distance")}</p>
          <p className="mt-0.5 text-sm font-extrabold text-main">{distanceToBus !== null ? `${distanceToBus.toFixed(1)} ${t("kmUnit")}` : t("noValue")}</p>
        </div>
      </div>

      {student ? (
        <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl font-extrabold text-slate-900 shadow-[var(--shadow-accent)]">
              {student.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold text-main">{student.name}</h3>
              <p className="text-sm text-muted">{student.grade || t("grade")} • {busWithLiveLocation?.routeName || t("routeUndefined")}</p>
            </div>
          </div>
        </div>
      ) : null}

      {assignmentMessage ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {assignmentMessage}
        </div>
      ) : null}

      {proximityAlert ? (
        <div className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
          {proximityAlert}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleReady}
          disabled={readyState === "ready"}
          className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-white p-4 shadow-sm transition active:scale-[0.97] disabled:opacity-50"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
            <HiCheckCircle className="text-2xl" />
          </div>
          <span className="text-sm font-bold text-main">{t("ready")}</span>
          <span className="text-[11px] text-muted">{t("childIsReady")}</span>
        </button>
        <button
          type="button"
          onClick={handleNotComing}
          disabled={savingAbsence || readyState === "not-coming"}
          className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-white p-4 shadow-sm transition active:scale-[0.97] disabled:opacity-50"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <HiXCircle className="text-2xl" />
          </div>
          <span className="text-sm font-bold text-main">{t("absent")}</span>
          <span className="text-[11px] text-muted">{t("declareAbsent")}</span>
        </button>
      </div>

      {readyState !== "waiting" ? (
        <MotionDiv
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-[20px] px-4 py-3 text-center text-sm font-bold ${
            readyState === "ready"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {readyState === "ready" ? `✓ ${t("childMarkedReady")}` : `✗ ${t("absenceConfirmedToday")}`}
        </MotionDiv>
      ) : null}

      {notifications.length > 0 ? (
        <div className="rounded-[24px] border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-main">{t("latestAlerts")}</h3>
            <button type="button" onClick={() => setActiveTab("alerts")} className="text-xs font-bold text-accent transition hover:text-accent-strong">
              {t("viewAll")}
            </button>
          </div>
          <div className="space-y-2">
            {notificationFeed.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-[16px] bg-card-soft px-3.5 py-2.5">
                <p className="truncate text-sm font-semibold text-main">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted">{item.helper}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HomeTab;
