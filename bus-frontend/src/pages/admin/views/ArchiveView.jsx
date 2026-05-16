import { useEffect, useMemo, useState } from "react";
import { HiClock, HiFilter, HiIdentification, HiOutlineTable, HiSearch } from "react-icons/hi";
import PanelCard from "../../../components/ui/PanelCard";
import SectionHeader from "../../../components/ui/SectionHeader";
import { useLanguage } from "../../../i18n";

function formatDateTime(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateInput(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const config = status === "absent"
    ? { label: "Absent", className: "bg-rose-100 text-rose-700" }
    : status === "in_bus"
      ? { label: "À bord", className: "bg-emerald-100 text-emerald-700" }
      : { label: status, className: "bg-slate-100 text-slate-600" };

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${config.className}`}>{config.label}</span>;
}

function FilterField({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function baseInputClassName() {
  return "h-12 w-full rounded-[16px] border border-line bg-white px-4 text-sm font-semibold text-main outline-none transition placeholder:text-muted focus:border-accent";
}

function StudentDossier({ dossier, t }) {
  return (
    <div className="space-y-5">
      <SectionHeader eyebrow={dossier.massarCode} title={dossier.fullName} description={`${t("studentDossier")} • ${dossier.totalTrips} ${t("trips")}`} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("totalTripsTaken")}</p>
          <p className="mt-3 text-2xl font-extrabold text-main">{dossier.totalTrips}</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("attendanceRateLabel")}</p>
          <p className="mt-3 text-2xl font-extrabold text-main">{dossier.attendanceRate}%</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("nudgeNotificationsLabel")}</p>
          <p className="mt-3 text-2xl font-extrabold text-main">{dossier.nudgeCount}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-line">
        <div className="grid grid-cols-[0.9fr_0.7fr_0.7fr_0.7fr] gap-4 bg-card-soft px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
          <span>{t("dateLabel")}</span>
          <span>Trip ID</span>
          <span>{t("tripTypeLabel")}</span>
          <span>{t("status")}</span>
        </div>
        <div className="divide-y divide-line bg-white">
          {dossier.history.map((item) => (
            <div key={`${item.tripId}-${item.date}`} className="grid grid-cols-[0.9fr_0.7fr_0.7fr_0.7fr] gap-4 px-4 py-4">
              <p className="text-sm text-main">{formatDateTime(item.date)}</p>
              <p className="text-sm font-semibold text-main">{item.tripId}</p>
              <p className="text-sm text-main">{item.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller")}</p>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DriverBusDossier({ dossier, entityType, t }) {
  return (
    <div className="space-y-5">
      <SectionHeader eyebrow={entityType === "driver" ? t("driverDossier") : t("busDossier")} title={dossier.title} description={dossier.description} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("totalTripsCompleted")}</p>
          <p className="mt-3 text-2xl font-extrabold text-main">{dossier.totalTrips}</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("averageDurationLabel")}</p>
          <p className="mt-3 text-2xl font-extrabold text-main">{dossier.averageDuration} min</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("tripTypesCovered")}</p>
          <p className="mt-3 text-lg font-extrabold text-main">{dossier.tripTypes}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-line">
        <div className="grid grid-cols-[0.8fr_1fr_0.6fr_0.6fr] gap-4 bg-card-soft px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
          <span>Trip</span>
          <span>{t("route")}</span>
          <span>{t("tripTypeLabel")}</span>
          <span>{t("tripDuration")}</span>
        </div>
        <div className="divide-y divide-line bg-white">
          {dossier.trips.map((trip) => (
            <div key={trip.id} className="grid grid-cols-[0.8fr_1fr_0.6fr_0.6fr] gap-4 px-4 py-4">
              <p className="text-sm font-semibold text-main">{trip.id}</p>
              <p className="text-sm text-muted">{trip.routeName}</p>
              <p className="text-sm text-main">{trip.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller")}</p>
              <p className="text-sm font-semibold text-main">{trip.durationMinutes} min</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TripDetail({ selectedTrip, onOpenStudent, t }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow={selectedTrip.id}
        title={`${selectedTrip.busName} • ${selectedTrip.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller")}`}
        description={`${selectedTrip.routeName} • ${selectedTrip.driverName}`}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] bg-card-soft p-4">
          <div className="flex items-center gap-2">
            <HiClock className="text-lg text-accent" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("tripDuration")}</p>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-main">{selectedTrip.durationMinutes} min</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("startDate")} / {t("endDate")}</p>
          <p className="mt-3 text-sm font-semibold text-main">{formatDateTime(selectedTrip.startedAt)}</p>
          <p className="mt-1 text-sm text-muted">{formatDateTime(selectedTrip.completedAt)}</p>
        </div>
        <div className="rounded-[20px] bg-card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{t("attendanceRateLabel")}</p>
          <p className="mt-3 text-sm font-semibold text-main">{selectedTrip.boardedCount} {t("onBoard")}</p>
          <p className="mt-1 text-sm text-muted">{selectedTrip.absentCount} {t("absentLabel")}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HiIdentification className="text-lg text-accent" />
          <h4 className="text-lg font-extrabold text-main">{t("studentsLabel")}</h4>
        </div>
        <div className="overflow-hidden rounded-[22px] border border-line">
          <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.7fr] gap-4 bg-card-soft px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
            <span>{t("studentName")}</span>
            <span>Massar</span>
            <span>{t("address")}</span>
            <span>{t("status")}</span>
          </div>
          <div className="divide-y divide-line bg-white">
            {selectedTrip.attendance.map((entry) => (
              <div key={`${selectedTrip.id}-${entry.studentId}`} className="grid grid-cols-[1.2fr_0.8fr_1fr_0.7fr] gap-4 px-4 py-4">
                <button type="button" onClick={() => onOpenStudent(entry)} className="text-left">
                  <p className="text-sm font-semibold text-main transition hover:text-accent">{entry.fullName}</p>
                </button>
                <p className="text-sm font-mono font-bold text-main">{entry.massarCode}</p>
                <p className="text-sm text-muted">{entry.pickupAddress}</p>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchiveView({ archiveTrips, notifications = [] }) {
  const { t } = useLanguage();
  const [selectedTripId, setSelectedTripId] = useState(archiveTrips[0]?.id || null);
  const [dateStart, setDateStart] = useState(archiveTrips.length ? formatDateInput(archiveTrips[archiveTrips.length - 1].startedAt) : "");
  const [dateEnd, setDateEnd] = useState(archiveTrips.length ? formatDateInput(archiveTrips[0].startedAt) : "");
  const [busFilter, setBusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [detailMode, setDetailMode] = useState("trip");
  const [entityDetail, setEntityDetail] = useState(null);

  const busOptions = useMemo(() => Array.from(new Map(archiveTrips.map((trip) => [trip.busId, { id: trip.busId, label: `${trip.busName} • ${trip.plateNumber}` }])).values()), [archiveTrips]);
  const driverOptions = useMemo(() => Array.from(new Map(archiveTrips.map((trip) => [trip.driverId, { id: trip.driverId, label: trip.driverName }])).values()), [archiveTrips]);

  const filteredTrips = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return archiveTrips.filter((trip) => {
      const tripDate = formatDateInput(trip.startedAt);
      const matchesStart = !dateStart || tripDate >= dateStart;
      const matchesEnd = !dateEnd || tripDate <= dateEnd;
      const matchesBus = busFilter === "all" || String(trip.busId) === busFilter;
      const matchesDriver = driverFilter === "all" || String(trip.driverId) === driverFilter;
      const matchesType = typeFilter === "all" || trip.type === typeFilter;
      const matchesStudent = !normalizedSearch || trip.attendance.some((entry) => `${entry.fullName} ${entry.massarCode}`.toLowerCase().includes(normalizedSearch));
      return matchesStart && matchesEnd && matchesBus && matchesDriver && matchesType && matchesStudent;
    });
  }, [archiveTrips, busFilter, dateEnd, dateStart, driverFilter, studentSearch, typeFilter]);

  useEffect(() => {
    if (!filteredTrips.length) {
      setSelectedTripId(null);
      return;
    }

    if (!selectedTripId || !filteredTrips.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId(filteredTrips[0].id);
      setDetailMode("trip");
      setEntityDetail(null);
    }
  }, [filteredTrips, selectedTripId]);

  const selectedTrip = useMemo(() => filteredTrips.find((trip) => trip.id === selectedTripId) || filteredTrips[0] || null, [filteredTrips, selectedTripId]);

  const matchedStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();
    if (!normalizedSearch) return [];

    const map = new Map();
    archiveTrips.forEach((trip) => {
      trip.attendance.forEach((entry) => {
        if (`${entry.fullName} ${entry.massarCode}`.toLowerCase().includes(normalizedSearch) && !map.has(entry.studentId)) {
          map.set(entry.studentId, entry);
        }
      });
    });
    return Array.from(map.values()).slice(0, 8);
  }, [archiveTrips, studentSearch]);

  const openStudentDossier = (studentEntry) => {
    const history = archiveTrips
      .filter((trip) => trip.attendance.some((entry) => entry.studentId === studentEntry.studentId))
      .map((trip) => ({
        tripId: trip.id,
        date: trip.startedAt,
        type: trip.type,
        status: trip.attendance.find((entry) => entry.studentId === studentEntry.studentId)?.status || "waiting",
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalTrips = history.length;
    const presentTrips = history.filter((item) => item.status === "in_bus").length;
    const absentTrips = history.filter((item) => item.status === "absent").length;
    const nudgeCount = notifications.filter((notification) => {
      const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
      return (text.includes("nudge") || text.includes("المرجو الإسراع")) && (notification.studentName || "").toLowerCase() === studentEntry.fullName.toLowerCase();
    }).length;

    setDetailMode("student");
    setEntityDetail({
      studentId: studentEntry.studentId,
      fullName: studentEntry.fullName,
      massarCode: studentEntry.massarCode,
      totalTrips,
      attendanceRate: totalTrips ? Math.round((presentTrips / (presentTrips + absentTrips || totalTrips)) * 100) : 0,
      nudgeCount,
      history,
    });
  };

  const openDriverDossier = (trip) => {
    const trips = archiveTrips.filter((item) => item.driverId === trip.driverId);
    setDetailMode("driver");
    setEntityDetail({
      title: trip.driverName,
      description: `${t("driverDossier")} • ${trip.busName}`,
      totalTrips: trips.length,
      averageDuration: trips.length ? Math.round(trips.reduce((sum, item) => sum + item.durationMinutes, 0) / trips.length) : 0,
      tripTypes: Array.from(new Set(trips.map((item) => (item.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller"))))).join(" / "),
      trips,
    });
  };

  const openBusDossier = (trip) => {
    const trips = archiveTrips.filter((item) => item.busId === trip.busId);
    setDetailMode("bus");
    setEntityDetail({
      title: `${trip.busName} • ${trip.plateNumber}`,
      description: `${t("busDossier")} • ${trip.routeName}`,
      totalTrips: trips.length,
      averageDuration: trips.length ? Math.round(trips.reduce((sum, item) => sum + item.durationMinutes, 0) / trips.length) : 0,
      tripTypes: Array.from(new Set(trips.map((item) => (item.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller"))))).join(" / "),
      trips,
    });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-4 z-20 rounded-[24px] border border-line bg-white/90 p-4 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <HiFilter className="text-lg text-accent" />
          <p className="text-sm font-extrabold text-main">{t("filters")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label={t("startDate")}><input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} className={baseInputClassName()} /></FilterField>
          <FilterField label={t("endDate")}><input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} className={baseInputClassName()} /></FilterField>
          <FilterField label={t("selectBusLabel")}><select value={busFilter} onChange={(event) => setBusFilter(event.target.value)} className={baseInputClassName()}><option value="all">{t("allBuses")}</option>{busOptions.map((option) => <option key={option.id} value={String(option.id)}>{option.label}</option>)}</select></FilterField>
          <FilterField label={t("selectDriverLabel")}><select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)} className={baseInputClassName()}><option value="all">{t("allDrivers")}</option>{driverOptions.map((option) => <option key={option.id} value={String(option.id)}>{option.label}</option>)}</select></FilterField>
          <FilterField label={t("tripTypeLabel")}><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={baseInputClassName()}><option value="all">{t("allTripTypes")}</option><option value="aller">{t("tripTypeAller")}</option><option value="retour">{t("tripTypeRetour")}</option></select></FilterField>
          <FilterField label={t("searchStudentLabel")}>
            <div className="relative">
              <HiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder={t("studentNameOrMassar")} className={`${baseInputClassName()} pl-11`} />
            </div>
          </FilterField>
        </div>
        {matchedStudents.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {matchedStudents.map((student) => (
              <button key={student.studentId} type="button" onClick={() => openStudentDossier(student)} className="rounded-full border border-line bg-card-soft px-3 py-2 text-xs font-bold text-main transition hover:border-accent hover:text-accent">
                {student.fullName} • {student.massarCode}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <PanelCard className="space-y-4">
          <div className="flex items-center gap-3">
            <HiOutlineTable className="text-2xl text-accent" />
            <div>
              <h3 className="text-lg font-extrabold text-main">{t("trips")}</h3>
              <p className="text-sm text-muted">{filteredTrips.length} trajet(s) correspondent aux filtres actifs.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-line">
            <div className="grid grid-cols-[0.9fr_0.9fr_0.65fr_0.55fr_0.55fr] gap-4 bg-card-soft px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              <span>Trip</span>
              <span>Bus / {t("driverLabel")}</span>
              <span>{t("tripTypeLabel")}</span>
              <span>{t("tripDuration")}</span>
              <span>{t("absentLabel")}</span>
            </div>
            <div className="divide-y divide-line bg-white">
              {filteredTrips.map((trip) => {
                const active = trip.id === selectedTrip?.id && detailMode === "trip";
                return (
                  <button key={trip.id} type="button" onClick={() => { setSelectedTripId(trip.id); setDetailMode("trip"); setEntityDetail(null); }} className={`grid w-full grid-cols-[0.9fr_0.9fr_0.65fr_0.55fr_0.55fr] gap-4 px-4 py-4 text-left transition ${active ? "bg-accent-soft/60" : "hover:bg-card-soft/60"}`}>
                    <div>
                      <p className="text-sm font-extrabold text-main">{trip.id}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(trip.startedAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); openBusDossier(trip); }} className="block text-sm font-semibold text-main hover:text-accent">
                        {trip.busName} • {trip.plateNumber}
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); openDriverDossier(trip); }} className="block text-xs text-muted hover:text-accent">
                        {trip.driverName}
                      </button>
                    </div>
                    <div><span className={`rounded-full px-3 py-1 text-xs font-bold ${trip.type === "retour" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{trip.type === "retour" ? t("tripTypeRetour") : t("tripTypeAller")}</span></div>
                    <div><p className="text-sm font-semibold text-main">{trip.durationMinutes} min</p></div>
                    <div><p className="text-sm font-semibold text-rose-600">{trip.absentCount}</p></div>
                  </button>
                );
              })}
              {filteredTrips.length === 0 ? <div className="px-4 py-8 text-sm text-muted">{t("noTripsMatchFilters")}</div> : null}
            </div>
          </div>
        </PanelCard>

        <PanelCard className="space-y-5">
          {detailMode === "student" && entityDetail ? <StudentDossier dossier={entityDetail} t={t} /> : null}
          {detailMode === "driver" && entityDetail ? <DriverBusDossier dossier={entityDetail} entityType="driver" t={t} /> : null}
          {detailMode === "bus" && entityDetail ? <DriverBusDossier dossier={entityDetail} entityType="bus" t={t} /> : null}
          {detailMode === "trip" && selectedTrip ? <TripDetail selectedTrip={selectedTrip} onOpenStudent={openStudentDossier} t={t} /> : null}
          {!selectedTrip && !entityDetail ? <div className="rounded-[22px] border border-dashed border-line bg-card-soft p-6 text-sm text-muted">{t("noData")}</div> : null}
        </PanelCard>
      </div>
    </div>
  );
}

export default ArchiveView;
