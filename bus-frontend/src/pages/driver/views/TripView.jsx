import { HiHome, HiLocationMarker } from "react-icons/hi";
import DriverMapPanel from "../components/DriverMapPanel";

function TripView({
  t,
  busLive,
  routeStudents,
  waitingCount,
  mountedCount,
  absentCount,
  tripBusy,
  tripStarted,
  tripCompleted,
  currentStudent,
  handleStartTrip,
  handleDrop,
  handleStudentAction,
  routeLine,
  statusText,
  statusStage,
  bus,
}) {
  if (!tripStarted) {
    return (
      <div className="grid min-h-[calc(100vh-120px)] place-items-center">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 text-center shadow-[var(--shadow-panel)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-accent-soft">
            <HiHome className="text-3xl text-accent" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-main">{t("readyToStart")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("bus")}: {busLive?.name || t("notAssigned")} • {routeStudents.length} {t("studentsLabel")}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[16px] bg-card-soft p-3">
              <p className="text-xs text-muted">{t("waiting")}</p>
              <p className="mt-1 text-xl font-extrabold text-main">{waitingCount}</p>
            </div>
            <div className="rounded-[16px] bg-card-soft p-3">
              <p className="text-xs text-muted">{t("mounted")}</p>
              <p className="mt-1 text-xl font-extrabold text-main">{mountedCount}</p>
            </div>
            <div className="rounded-[16px] bg-card-soft p-3">
              <p className="text-xs text-muted">{t("absentLabel")}</p>
              <p className="mt-1 text-xl font-extrabold text-rose-500">{absentCount}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartTrip}
            disabled={tripBusy || !bus?.id}
            className="mt-6 h-14 w-full rounded-[18px] bg-accent text-lg font-extrabold text-slate-900 shadow-[var(--shadow-accent)] transition hover:bg-accent-strong disabled:opacity-60"
          >
            {t("startTrip")}
          </button>
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="grid min-h-[calc(100vh-120px)] place-items-center">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 text-center shadow-[var(--shadow-panel)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-50">
            <HiLocationMarker className="text-3xl text-emerald-500" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-main">{t("allProcessed")}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600">{t("mounted")}</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">{mountedCount}</p>
            </div>
            <div className="rounded-[16px] bg-rose-50 p-3">
              <p className="text-xs text-rose-500">{t("absentLabel")}</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-500">{absentCount}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDrop}
            disabled={tripBusy || tripCompleted}
            className="mt-6 h-14 w-full rounded-[18px] bg-accent text-lg font-extrabold text-slate-900 shadow-[var(--shadow-accent)] transition hover:bg-accent-strong disabled:opacity-60"
          >
            {tripCompleted ? `✓ ${t("tripCompleted")}` : t("dropStudents")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="rounded-[20px] border border-line bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">{t("progress")}</span>
          <span className="text-xs font-bold text-main">{routeStudents.length - waitingCount}/{routeStudents.length}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-card-soft">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${((routeStudents.length - waitingCount) / Math.max(routeStudents.length, 1)) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{mountedCount} {t("mounted")}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{absentCount} {t("absentLabel")}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />{waitingCount} {t("waiting")}</span>
        </div>
      </div>

      <DriverMapPanel busLocation={busLive?.location} pickupLocation={currentStudent.homeLocation} routeLine={routeLine} />

      <div className="rounded-[16px] bg-accent px-4 py-3 text-center text-sm font-extrabold text-slate-900 shadow-[var(--shadow-soft)]">
        {statusText}
      </div>

      <div className="rounded-[24px] border border-line bg-white p-5 shadow-[var(--shadow-panel)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("nextStudent")}</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg font-extrabold text-accent">
            {currentStudent.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-main">{currentStudent.name}</h2>
            <p className="truncate text-sm text-muted">{currentStudent.address}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-card-soft px-3 py-2">
            <p className="text-xs text-muted">{t("eta")}</p>
            <p className="mt-1 font-bold text-main">{statusStage === "door" ? 1 : statusStage === "near" ? 2 : 4} {t("minUnit")}</p>
          </div>
          <div className="rounded-[14px] bg-card-soft px-3 py-2">
            <p className="text-xs text-muted">{t("tripStatusLabel")}</p>
            <p className="mt-1 font-bold text-main">{t("pickupRunning")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleStudentAction("mounted")}
          disabled={tripBusy}
          className="h-14 rounded-[18px] bg-emerald-500 text-base font-extrabold text-white shadow-lg transition hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-60"
        >
          ✓ {t("mounted")}
        </button>
        <button
          type="button"
          onClick={() => handleStudentAction("absent")}
          disabled={tripBusy}
          className="h-14 rounded-[18px] bg-rose-500 text-base font-extrabold text-white shadow-lg transition hover:bg-rose-400 active:scale-[0.97] disabled:opacity-60"
        >
          ✗ {t("absent")}
        </button>
      </div>
    </div>
  );
}

export default TripView;
