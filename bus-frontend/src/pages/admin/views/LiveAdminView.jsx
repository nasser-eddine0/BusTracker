import { HiLocationMarker, HiTruck, HiUserGroup } from "react-icons/hi";
import PanelCard from "../../../components/ui/PanelCard";
import AdminGlobalMap from "../components/AdminGlobalMap";

function LiveAdminView({ t, liveTrips, liveBuses }) {
  const mappedBuses = liveBuses.filter((bus) => bus.location);

  return (
    <div className="space-y-6">
      <PanelCard>
        <AdminGlobalMap buses={mappedBuses} t={t} height={460} />
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-main">{t("activeTripsShort")}</h3>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {liveTrips.length} {t("liveCountSuffix")}
            </span>
          </div>
          <div className="space-y-3">
            {liveTrips.map((trip) => (
              <article key={trip.id} className="rounded-[22px] border border-line bg-card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-main">{trip.busName}</p>
                    <p className="mt-1 text-sm text-muted">
                      {trip.type === "retour" ? t("returnTrip") : t("outboundTrip")} - {trip.routeName || t("activeRoute")}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    {trip.statusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{t("driverLabel")}</p>
                    <p className="mt-1 text-sm font-semibold text-main">{trip.driverName || t("assigned")}</p>
                  </div>
                  <div className="rounded-[18px] bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{t("studentsTrackedShort")}</p>
                    <p className="mt-1 text-sm font-semibold text-main">{trip.studentsTracked}</p>
                  </div>
                  <div className="rounded-[18px] bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{t("positionLabel")}</p>
                    <p className="mt-1 text-sm font-semibold text-main">
                      {trip.location ? `${trip.location.lat.toFixed(4)}, ${trip.location.lng.toFixed(4)}` : t("notAvailable")}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            {liveTrips.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-line bg-card-soft p-6 text-sm text-muted">
                {t("noActiveTrips")}
              </div>
            ) : null}
          </div>
        </PanelCard>

        <PanelCard className="space-y-3">
          <div className="rounded-[22px] bg-card-soft p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-slate-950">
                <HiTruck className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">{mappedBuses.length} {t("geolocatedBuses")}</p>
                <p className="text-xs text-muted">{t("firebaseLiveStream")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] bg-card-soft p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                <HiLocationMarker className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">{liveTrips.filter((trip) => trip.location).length} {t("validPositions")}</p>
                <p className="text-xs text-muted">{t("readyForMonitoring")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] bg-card-soft p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <HiUserGroup className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">{liveTrips.reduce((sum, trip) => sum + trip.studentsTracked, 0)} {t("studentsMonitored")}</p>
                <p className="text-xs text-muted">{t("operationalView")}</p>
              </div>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

export default LiveAdminView;
