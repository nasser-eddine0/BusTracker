import { useState } from "react";
import { HiCheckCircle, HiHome, HiLocationMarker, HiXCircle } from "react-icons/hi";
import { HiClock } from "react-icons/hi2";
import DriverMapPanel from "../components/DriverMapPanel";

const STATUS_BADGE = {
  waiting: { label: "waiting", bg: "bg-sky-100", text: "text-sky-700", icon: HiClock },
  ready: { label: "ready", bg: "bg-teal-100", text: "text-teal-700", icon: HiCheckCircle },
  mounted: { label: "mounted", bg: "bg-emerald-100", text: "text-emerald-700", icon: HiCheckCircle },
  in_bus: { label: "mounted", bg: "bg-emerald-100", text: "text-emerald-700", icon: HiCheckCircle },
  absent: { label: "absentLabel", bg: "bg-rose-100", text: "text-rose-600", icon: HiXCircle },
  dropped: { label: "dropped", bg: "bg-accent-soft", text: "text-accent", icon: HiCheckCircle },
};

function TripView({
  t,
  busLive,
  routeStudents,
  waitingStudents,
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
  handleSelectStudent,
  handleNudgeParent,
  distanceToTarget,
  statusText,
  statusStage,
  bus,
}) {
  // showMap toggles between student list view and map view for the current target
  const [showMap, setShowMap] = useState(false);

  /* ── Phase 1: Pre-trip — "Ready to start" screen ── */
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

  /* ── All students processed — drop-off screen ── */
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

  /* ── Phase 2+3+4: Active trip — Student list OR Map+Actions ── */
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {/* Progress bar */}
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

      {!showMap ? (
        /* ── Student list — ALL students with status badges, clickable ── */
        <div className="rounded-[24px] border border-line bg-white p-5 shadow-[var(--shadow-panel)]">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {t("studentsLabel")} ({routeStudents.length})
          </p>
          <div className="space-y-2">
            {routeStudents.map((student) => {
              const badge = STATUS_BADGE[student.status] || STATUS_BADGE.waiting;
              const BadgeIcon = badge.icon;
              const isWaiting = student.status === "waiting" || student.status === "ready";
              const isSelected = currentStudent?.id === student.id;

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => { if (isWaiting) handleSelectStudent(student.id); }}
                  disabled={!isWaiting}
                  className={`flex w-full items-center gap-3 rounded-[16px] border p-3 text-left transition ${
                    isSelected
                      ? "border-accent bg-accent-soft ring-2 ring-accent/30"
                      : isWaiting
                        ? "border-line bg-card-soft hover:border-accent/40 hover:bg-accent-soft/50 cursor-pointer"
                        : "border-line bg-white opacity-70 cursor-default"
                  }`}
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                    isSelected ? "bg-accent text-slate-900" : "bg-accent-soft text-accent"
                  }`}>
                    {student.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-main">{student.name}</p>
                    <p className="truncate text-xs text-muted">{student.address}</p>
                  </div>
                  {/* Status badge */}
                  <div className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 ${badge.bg}`}>
                    <BadgeIcon className={`text-xs ${badge.text}`} />
                    <span className={`text-[10px] font-bold ${badge.text}`}>{t(badge.label)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowMap(true)}
              disabled={!currentStudent}
              className="h-12 w-full rounded-[16px] bg-accent text-sm font-extrabold text-slate-900 shadow-[var(--shadow-accent)] transition hover:bg-accent-strong active:scale-[0.97] disabled:opacity-60"
            >
              {t("goToStudent") || "Go"} → {currentStudent?.name || ""}
            </button>
          </div>
        </div>
      ) : (
        /* ── Phase 3+4: Map view + Actions at the door ── */
        <>
          <DriverMapPanel busLocation={busLive?.location} pickupLocation={currentStudent.homeLocation} />

          {/* Status + distance badge */}
          <div className="flex items-center justify-between rounded-[16px] bg-accent px-4 py-3 shadow-[var(--shadow-soft)]">
            <span className="text-sm font-extrabold text-slate-900">{statusText}</span>
            {distanceToTarget !== null && (
              <span className="rounded-full bg-white/30 px-3 py-1 text-xs font-bold text-slate-900">
                {distanceToTarget >= 1000
                  ? `${(distanceToTarget / 1000).toFixed(1)} km`
                  : `${distanceToTarget} m`}
              </span>
            )}
          </div>

          {/* Current target student card */}
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
                <p className="text-xs text-muted">{t("distance")}</p>
                <p className="mt-1 font-bold text-main">
                  {distanceToTarget !== null
                    ? distanceToTarget >= 1000
                      ? `${(distanceToTarget / 1000).toFixed(1)} km`
                      : `${distanceToTarget} m`
                    : t("calculating") || "..."}
                </p>
              </div>
              <div className="rounded-[14px] bg-card-soft px-3 py-2">
                <p className="text-xs text-muted">{t("tripStatusLabel")}</p>
                <p className="mt-1 font-bold text-main">{t("pickupRunning")}</p>
              </div>
            </div>
          </div>

          {/* Action buttons: Present / Absent / Hurry Up / Back */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { handleStudentAction("mounted"); setShowMap(false); }}
              disabled={tripBusy}
              className="h-14 rounded-[18px] bg-emerald-500 text-base font-extrabold text-white shadow-lg transition hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-60"
            >
              ✓ {t("mounted")}
            </button>
            <button
              type="button"
              onClick={() => { handleStudentAction("absent"); setShowMap(false); }}
              disabled={tripBusy}
              className="h-14 rounded-[18px] bg-rose-500 text-base font-extrabold text-white shadow-lg transition hover:bg-rose-400 active:scale-[0.97] disabled:opacity-60"
            >
              ✗ {t("absent")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleNudgeParent}
              disabled={tripBusy}
              className="h-12 rounded-[16px] border-2 border-amber-400 bg-amber-50 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 active:scale-[0.97] disabled:opacity-60"
            >
              {t("hurryUp") || "المرجو الإسراع"}
            </button>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="h-12 rounded-[16px] border border-line bg-white text-sm font-bold text-main shadow-sm transition hover:bg-card-soft active:scale-[0.97]"
            >
              {t("backToList") || "Back to list"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TripView;
